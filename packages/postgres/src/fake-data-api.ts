import { randomUUID } from 'crypto'
import type { ExecuteStatementCommandInput, Field } from '@aws-sdk/client-rds-data'
import pg from 'pg'
import { FIRST_OWN_OID, SUPPORTED_TYPES } from './result'
import { MAX_RESULT_BYTES, MAX_SQL_LENGTH, splitStatements } from './statement'

// A stand-in for the RDS Data API in front of a local Postgres, as close
// to the documented service as can be told without it:
// - one statement a call, of 65,536 characters at most;
// - named parameters (:name) that arrive typed: a string as varchar, a
//   whole number as bigint, a fraction as double precision, a boolean as
//   boolean, with the type hints the docs list;
// - every call on a session reset with DISCARD ALL, so only what the
//   database itself sets (its search_path) holds from call to call;
// - a result as typed fields with the column type names, of the types the
//   docs list, of 1 MiB at most;
// - Postgres errors worded "ERROR: …; SQLState: 23505";
// - transactions by id, one statement at a time.
// What it can't promise: that the real service spells every value the same.

type FakeOptions = {
	// Postgres on this machine: a superuser url without a database.
	url: string
	// How many calls a paused cluster cancels before it has resumed.
	paused?: number
	// The milliseconds a statement gets, 45 seconds on the real service.
	timeout?: number
}

const HINTS: Record<string, number> = { UUID: 2950, TIMESTAMP: 1114, DATE: 1082, TIME: 1083, DECIMAL: 1700, JSON: 114 }

const serviceError = (name: string, message: string) => Object.assign(new Error(message), { name })

const databaseError = (error: pg.DatabaseError) => {
	const lines = [
		`ERROR: ${error.message}`,
		error.detail ? `  Detail: ${error.detail}` : '',
		error.hint ? `  Hint: ${error.hint}` : '',
		error.position ? `  Position: ${error.position}` : '',
		error.where ? `  Where: ${error.where.split('\n')[0]}` : '',
	]

	return serviceError('DatabaseErrorException', `${lines.filter(Boolean).join('\n')}; SQLState: ${error.code}`)
}

// Named parameters in the order they appear, as $1, $2 and up. Strings,
// quoted names, dollar quoted bodies, comments & casts (::) are skipped.
const bindNames = (sql: string) => {
	const names: string[] = []
	const skip = /'(?:[^']|'')*'|"(?:[^"]|"")*"|\$([A-Za-z_]\w*)?\$[\s\S]*?\$\1\$|--[^\n]*|\/\*[\s\S]*?\*\/|::/y
	let text = ''

	for (let index = 0; index < sql.length;) {
		skip.lastIndex = index

		const skipped = skip.exec(sql)?.[0]

		if (skipped) {
			text += skipped
			index += skipped.length
			continue
		}

		const name = sql[index] === ':' ? /^:([A-Za-z_]\w*)/.exec(sql.slice(index, index + 80))?.[1] : undefined

		if (name) {
			if (!names.includes(name)) {
				names.push(name)
			}

			text += `$${names.indexOf(name) + 1}`
			index += name.length + 1
			continue
		}

		text += sql[index]
		index++
	}

	return { text, names }
}

const typeOf = (parameter: NonNullable<ExecuteStatementCommandInput['parameters']>[number]) => {
	// One of these is set: the SDK types them as a union of single members.
	const value: {
		isNull?: boolean
		stringValue?: string
		longValue?: number
		doubleValue?: number
		booleanValue?: boolean
		blobValue?: Uint8Array
	} = parameter.value ?? {}

	if (value.isNull) return { oid: 0, value: null }
	if (value.stringValue !== undefined)
		return { oid: HINTS[parameter.typeHint ?? ''] ?? 1043, value: value.stringValue }
	if (value.longValue !== undefined) return { oid: 20, value: String(value.longValue) }
	if (value.doubleValue !== undefined) return { oid: 701, value: String(value.doubleValue) }
	if (value.booleanValue !== undefined) return { oid: 16, value: String(value.booleanValue) }
	if (value.blobValue !== undefined) return { oid: 17, value: Buffer.from(value.blobValue) }

	throw serviceError('ValidationException', 'Array parameters are not supported')
}

// Every value as the text Postgres sent, to spell it the service's way.
const raw = { getTypeParser: () => (value: string) => value }

const TEXT_ARRAY: number = 1009
const parseTextArray = pg.types.getTypeParser(TEXT_ARRAY, 'text') as (value: string) => (string | null)[]

const NUMBERS = new Set(['int2', 'int4', 'int8'])
const FRACTIONS = new Set(['float4', 'float8'])

export const fakeDataApi = (options: FakeOptions) => {
	const pools = new Map<string, pg.Pool>()
	const typeNames = new Map<number, string>()
	const transactions = new Map<string, { connection: pg.PoolClient; running?: Promise<unknown> }>()
	const calls: { name: string; input: Record<string, unknown> }[] = []
	let paused = options.paused ?? 0

	const poolOf = (database: string) => {
		let pool = pools.get(database)

		if (!pool) {
			pool = new pg.Pool({ connectionString: `${options.url}/${database}`, max: 10, allowExitOnIdle: true })
			pool.on('error', () => {})
			pools.set(database, pool)
		}

		return pool
	}

	const typeNameOf = async (connection: pg.PoolClient | pg.Pool, oid: number) => {
		if (!typeNames.has(oid)) {
			const { rows } = await connection.query(
				'SELECT typname::text AS name, typtype::text AS kind FROM pg_type WHERE oid = $1',
				[oid]
			)

			typeNames.set(oid, rows[0].kind === 'e' ? 'enum' : rows[0].name)
		}

		return typeNames.get(oid)!
	}

	const encode = (typeName: string, value: string | null, input: ExecuteStatementCommandInput): Field => {
		if (value === null) {
			return { isNull: true }
		}

		const longs = input.resultSetOptions?.longReturnType === 'STRING'
		const decimals = input.resultSetOptions?.decimalReturnType !== 'DOUBLE_OR_LONG'

		if (typeName.startsWith('_')) {
			const element = typeName.slice(1)
			const elements = parseTextArray(value)

			if (elements.some(Array.isArray)) {
				throw serviceError('UnsupportedResultException', 'The result contains a multidimensional array.')
			}

			if (element === 'bool') return { arrayValue: { booleanValues: elements.map(item => item === 't') } }
			if (NUMBERS.has(element)) return { arrayValue: { longValues: elements.map(Number) } }
			if (FRACTIONS.has(element)) return { arrayValue: { doubleValues: elements.map(Number) } }

			return { arrayValue: { stringValues: elements as string[] } }
		}

		if (typeName === 'bool') return { booleanValue: value === 't' }
		if (NUMBERS.has(typeName)) return longs ? { stringValue: value } : { longValue: Number(value) }
		if (FRACTIONS.has(typeName)) return { doubleValue: Number(value) }
		if (typeName === 'numeric') return decimals ? { stringValue: value } : { doubleValue: Number(value) }
		if (typeName === 'bytea') return { blobValue: Buffer.from(value.slice(2), 'hex') }
		// A moment comes back in UTC, without its offset.
		if (typeName === 'timestamptz') return { stringValue: value.replace(/[+-]\d\d(:\d\d)?$/, '') }

		return { stringValue: value }
	}

	const run = async (connection: pg.PoolClient, input: ExecuteStatementCommandInput) => {
		const sql = input.sql ?? ''

		if (sql.length > MAX_SQL_LENGTH) {
			throw serviceError(
				'ValidationException',
				"Value at 'sql' failed to satisfy constraint: Member must have length less than or equal to 65536"
			)
		}

		if (splitStatements(sql).length > 1) {
			throw serviceError('ValidationException', "Multistatements aren't supported.")
		}

		const { text, names } = bindNames(sql)
		const givenParameters = new Map((input.parameters ?? []).map(parameter => [parameter.name, typeOf(parameter)]))
		const bound = names.map(name => {
			const parameter = givenParameters.get(name)

			if (!parameter) {
				throw serviceError('BadRequestException', `Parameter "${name}" has value not set`)
			}

			return parameter
		})

		let result: pg.QueryResult

		try {
			result = await connection.query({
				text,
				values: bound.map(parameter => parameter.value),
				// pg sends these as the parameter types & reads values through them.
				types: Object.assign(
					bound.map(parameter => parameter.oid),
					raw
				) as never,
			})
		} catch (error) {
			if (error instanceof pg.DatabaseError && error.code === '57014') {
				throw serviceError('StatementTimeoutException', 'Request timed out')
			}

			throw error instanceof pg.DatabaseError ? databaseError(error) : error
		}

		const columns: { name: string; label: string; typeName: string }[] = []

		// One at a time: a connection runs one query at once.
		for (const field of result.fields) {
			const typeName = await typeNameOf(connection, field.dataTypeID)
			const returned =
				SUPPORTED_TYPES.has(field.dataTypeID) ||
				(field.dataTypeID >= FIRST_OWN_OID && ['enum', 'vector'].includes(typeName))

			if (!returned) {
				throw serviceError(
					'UnsupportedResultException',
					`The result contains the unsupported data type ${typeName.toUpperCase()}.`
				)
			}

			columns.push({ name: field.name, label: field.name, typeName })
		}

		const bytes = result.rows.reduce(
			(total, row) =>
				total +
				Object.values(row as Record<string, string | null>).reduce(
					(size, value) => size + Buffer.byteLength(value ?? ''),
					0
				),
			0
		)

		if (bytes > MAX_RESULT_BYTES) {
			throw serviceError('DatabaseErrorException', 'Database response exceeded size limit')
		}

		return {
			$metadata: {},
			numberOfRecordsUpdated: result.rowCount ?? 0,
			columnMetadata: columns,
			// pg keys a row by name, so two columns of one name are one here.
			records: result.rows.map(row =>
				columns.map(column =>
					encode(column.typeName, (row as Record<string, string | null>)[column.name] ?? null, input)
				)
			),
		}
	}

	const execute = async (input: ExecuteStatementCommandInput) => {
		const transaction = input.transactionId ? transactions.get(input.transactionId) : undefined

		if (input.transactionId && !transaction) {
			throw serviceError('TransactionNotFoundException', `Transaction ${input.transactionId} is not found`)
		}

		if (transaction) {
			if (transaction.running) {
				throw serviceError('DatabaseErrorException', 'Transaction is still running a query')
			}

			const running = run(transaction.connection, input).finally(() => {
				transaction.running = undefined
			})

			transaction.running = running

			// A statement that outlives its call runs on, when asked to.
			if (input.continueAfterTimeout && options.timeout) {
				const timedOut = Symbol('timeout')
				const first = await Promise.race([
					running,
					new Promise(resolve => setTimeout(() => resolve(timedOut), options.timeout)),
				])

				if (first === timedOut) {
					running.catch(() => {})
					throw serviceError('StatementTimeoutException', 'Request timed out')
				}
			}

			return running
		}

		const connection = await poolOf(input.database ?? 'postgres').connect()

		try {
			if (options.timeout) {
				await connection.query(`SET statement_timeout = ${options.timeout}`)
			}

			return await run(connection, input)
		} finally {
			// The service resets a session before another call uses it.
			await connection.query('DISCARD ALL').catch(() => {})
			connection.release()
		}
	}

	const send = async (command: { constructor: { name: string }; input: object }) => {
		const name = command.constructor.name.replace(/Command$/, '')
		const input = command.input as ExecuteStatementCommandInput

		calls.push({ name, input: command.input as Record<string, unknown> })

		if (paused > 0 && (name === 'ExecuteStatement' || name === 'BeginTransaction')) {
			paused--

			throw serviceError(
				'DatabaseResumingException',
				`The Aurora DB instance ${input.resourceArn} is resuming after being auto-paused. Please wait a few seconds and try again.`
			)
		}

		if (name === 'ExecuteStatement') {
			return execute(input)
		}

		if (name === 'BeginTransaction') {
			const connection = await poolOf(input.database ?? 'postgres').connect()
			const transactionId = randomUUID()

			await connection.query('BEGIN')
			transactions.set(transactionId, { connection })

			return { $metadata: {}, transactionId }
		}

		if (name === 'CommitTransaction' || name === 'RollbackTransaction') {
			const transaction = transactions.get(input.transactionId!)

			if (!transaction) {
				throw serviceError('TransactionNotFoundException', `Transaction ${input.transactionId} is not found`)
			}

			if (transaction.running) {
				throw serviceError('DatabaseErrorException', 'Transaction is still running a query')
			}

			transactions.delete(input.transactionId!)

			try {
				await transaction.connection.query(name === 'CommitTransaction' ? 'COMMIT' : 'ROLLBACK')
			} finally {
				await transaction.connection.query('DISCARD ALL').catch(() => {})
				transaction.connection.release()
			}

			return {
				$metadata: {},
				transactionStatus: name === 'CommitTransaction' ? 'Transaction Committed' : 'Rollback Complete',
			}
		}

		throw new Error(`The fake Data API has no ${name}.`)
	}

	return {
		// Answers an SDK command as the service would; a test's mock of
		// RDSDataClient hands the commands to it.
		send,
		// Every call the client made, in order.
		calls,
		pause(count: number) {
			paused = count
		},
		async close() {
			await Promise.all([...pools.values()].map(pool => pool.end()))
		},
	}
}
