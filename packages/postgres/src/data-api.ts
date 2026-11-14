import {
	BeginTransactionCommand,
	CommitTransactionCommand,
	ExecuteStatementCommand,
	type ExecuteStatementCommandOutput,
	RDSDataClient,
	RollbackTransactionCommand,
} from '@aws-sdk/client-rds-data'
import { decodeRecords } from './result'
import { MAX_RESULT_BYTES, renderQuery } from './statement'
import { createError, type PostgresClient, registerTransaction } from './transport'

export type PostgresDataClientProps = {
	// The Aurora cluster, and the secret with the user & password to it.
	clusterArn: string
	secretArn: string
	database: string
	// What sends the calls, with its own credentials & region. One shared
	// client from the environment by default.
	client?: RDSDataClient
	// How long a query waits for a paused cluster to resume, in
	// milliseconds. A minute by default.
	resumeTimeout?: number
}

// A paused cluster takes about 15 seconds to resume, and 30 or more after
// a day asleep.
const RESUME_TIMEOUT = 60_000

// The longest a transaction lives on the Data API is an hour.
const TRANSACTION_TIMEOUT = 55 * 60_000

// One SDK client for every database, so they share its open connections.
let shared: RDSDataClient | undefined

// One try per call: a retry by the SDK after a failed or lost answer
// could run a statement twice. What may be sent again is decided here.
const getApi = () => (shared ??= new RDSDataClient({ maxAttempts: 1 }))

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const nameOf = (error: unknown) => (error instanceof Error ? error.name : '')
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error))

const isStillRunning = (error: unknown) => /Transaction is still running a query/i.test(messageOf(error))

// A statement of a transaction may run on past its call. The next call of
// the transaction is refused until it is done, so that call is made again,
// for as long as a transaction may live.
const afterRunning = async <T>(call: () => Promise<T>, deadline: number): Promise<T> => {
	for (;;) {
		try {
			return await call()
		} catch (error) {
			if (!isStillRunning(error) || Date.now() > deadline) {
				throw error
			}
		}

		await sleep(5000)
	}
}

// What Postgres said, out of the Data API's wording of it:
// "ERROR: duplicate key value …\n  Detail: Key (id)=(1) already exists.; SQLState: 23505"
const toPostgresError = (error: unknown) => {
	const name = nameOf(error)
	const message = messageOf(error)

	if (name === 'StatementTimeoutException') {
		return createError('57014', 'canceling statement due to statement timeout')
	}

	if (name === 'UnsupportedResultException') {
		return createError(
			'0A000',
			`The Data API can't return the type of one of the columns. Cast it to text in the query, like days::text. (${message})`
		)
	}

	if (/exceeded size limit|response.*too large/i.test(message)) {
		return createError(
			'54000',
			`The result is over the ${MAX_RESULT_BYTES} bytes the Data API returns. Read it in parts, with a LIMIT. (${message})`
		)
	}

	const state = /SQLState: ([0-9A-Z]{5})/.exec(message)?.[1]

	if (!state) {
		return error
	}

	const [first = '', ...rest] = message.replace(/;?\s*SQLState: [0-9A-Z]{5}\s*$/, '').split('\n')
	const field = (label: string) => {
		const line = rest.find(line => line.trim().startsWith(`${label}:`))

		return line
			?.trim()
			.slice(label.length + 1)
			.trim()
	}

	return createError(state, first.replace(/^ERROR:\s*/, ''), {
		detail: field('Detail'),
		hint: field('Hint'),
		position: field('Position'),
		where: field('Where'),
	})
}

// Queries through the RDS Data API instead of a connection: one https
// call per statement, with the same placeholders, parameters, rows &
// errors as a client on a connection.
export const postgresDataClient = (props: PostgresDataClientProps): PostgresClient => {
	const api = props.client ?? getApi()
	const target = { resourceArn: props.clusterArn, secretArn: props.secretArn, database: props.database }
	const resumeTimeout = props.resumeTimeout ?? RESUME_TIMEOUT

	// A paused cluster cancels the call & starts resuming, so the call is
	// made again until the cluster answers.
	const whileResuming = async <T>(call: () => Promise<T>): Promise<T> => {
		const deadline = Date.now() + resumeTimeout

		for (let attempt = 1; ; attempt++) {
			try {
				return await call()
			} catch (error) {
				if (nameOf(error) !== 'DatabaseResumingException') {
					throw error
				}

				if (Date.now() > deadline) {
					throw createError(
						'57P03',
						`Postgres was paused and is still resuming after ${Math.round(resumeTimeout / 1000)} seconds. Try again in a moment.`
					)
				}
			}

			await sleep(Math.min(3000, 500 * attempt))
		}
	}

	const execute = async (
		sql: string,
		parameters: { name: string; value: string | null }[],
		transaction?: { id: string; deadline: number }
	): Promise<ExecuteStatementCommandOutput> => {
		const command = () =>
			new ExecuteStatementCommand({
				...target,
				sql,
				parameters:
					parameters.length > 0
						? parameters.map(({ name, value }) => ({
								name,
								value: value === null ? { isNull: true } : { stringValue: value },
							}))
						: undefined,
				transactionId: transaction?.id,
				// A statement of a transaction that outlives the call keeps
				// running, like AWS advises for DDL. Alone it stops.
				continueAfterTimeout: transaction ? true : undefined,
				includeResultMetadata: true,
				// Whole numbers & decimals as text, so none loses digits on the way.
				resultSetOptions: { longReturnType: 'STRING', decimalReturnType: 'STRING' },
			})

		try {
			if (!transaction) {
				return await whileResuming(() => api.send(command()))
			}

			return await afterRunning(async () => {
				try {
					return await api.send(command())
				} catch (error) {
					// Its call is over, the statement runs on.
					if (nameOf(error) === 'StatementTimeoutException') {
						return { $metadata: {} }
					}

					throw error
				}
			}, transaction.deadline)
		} catch (error) {
			throw toPostgresError(error)
		}
	}

	const client: PostgresClient = {
		async query<Row = Record<string, unknown>>(sql: string, params?: unknown[]) {
			const rendered = renderQuery(sql, params)

			return decodeRecords(await execute(rendered.sql, rendered.parameters)) as Row[]
		},

		// Nothing stays open between calls.
		async close() {},
	}

	registerTransaction(client, async run => {
		const { transactionId } = await whileResuming(() => api.send(new BeginTransactionCommand(target)))
		const transaction = { id: transactionId!, deadline: Date.now() + TRANSACTION_TIMEOUT }
		const end = { resourceArn: props.clusterArn, secretArn: props.secretArn, transactionId }

		try {
			const result = await run({
				query: async sql => decodeRecords(await execute(sql, [], transaction)),
			})

			await afterRunning(() => api.send(new CommitTransactionCommand(end)), transaction.deadline).catch(error => {
				throw toPostgresError(error)
			})

			return result
		} catch (error) {
			await afterRunning(() => api.send(new RollbackTransactionCommand(end)), transaction.deadline).catch(
				() => {}
			)

			throw error
		}
	})

	return client
}
