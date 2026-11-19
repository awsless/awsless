import {
	type CompiledQuery,
	type DatabaseConnection,
	type Driver,
	Kysely,
	PostgresAdapter,
	PostgresIntrospector,
	PostgresQueryCompiler,
	type QueryResult,
	type TransactionSettings,
} from 'kysely'
import { execute, type PostgresClient, type Session, transact } from './transport'

// The query builder is Kysely: a typed way to write sql, compiled to one
// statement a call, which is what the Data API takes.
export { sql } from 'kysely'
export type {
	ColumnType as PostgresColumn,
	Generated as PostgresGenerated,
	GeneratedAlways as PostgresGeneratedAlways,
	Kysely as PostgresQueryBuilder,
} from 'kysely'

export type PostgresQueryBuilderProps = {
	// Asked for on every statement: the caller may hand over another client,
	// like a test file that gets one of its own.
	client: () => PostgresClient | Promise<PostgresClient>
	// Runs around every statement, like for a trace span.
	wrap?: <T>(run: () => Promise<T>) => Promise<T>
}

// A transaction that stays open until the builder commits it or rolls it
// back, on top of the clients' own transaction that runs a callback.
type OpenTransaction = {
	session: Session
	commit: () => void
	rollback: (reason: unknown) => void
	done: Promise<void>
}

const ROLLED_BACK = Symbol('rolled back')

const ISOLATION_LEVELS = ['read uncommitted', 'read committed', 'repeatable read', 'serializable']
const ACCESS_MODES = ['read only', 'read write']

// What a transaction was asked to be, as Postgres takes it. The settings go
// into sql as written, so only what Postgres knows passes.
const transactionModes = ({ isolationLevel, accessMode }: TransactionSettings) => {
	if (isolationLevel && !ISOLATION_LEVELS.includes(isolationLevel)) {
		throw new TypeError(`Postgres has no "${isolationLevel}" isolation level.`)
	}

	if (accessMode && !ACCESS_MODES.includes(accessMode)) {
		throw new TypeError(`Postgres has no "${accessMode}" access mode.`)
	}

	return [isolationLevel && `ISOLATION LEVEL ${isolationLevel.toUpperCase()}`, accessMode?.toUpperCase()].filter(
		mode => mode !== undefined
	)
}

class Connection implements DatabaseConnection {
	transaction?: OpenTransaction

	constructor(private props: PostgresQueryBuilderProps) {}

	async executeQuery<Row>(query: CompiledQuery): Promise<QueryResult<Row>> {
		const wrap = this.props.wrap ?? (run => run())
		const params = [...query.parameters]

		const { rows, affected } = await wrap(async () => {
			return this.transaction
				? this.transaction.session.execute(query.sql, params)
				: execute(await this.props.client(), query.sql, params)
		})

		return { rows: rows as Row[], numAffectedRows: BigInt(affected) }
	}

	streamQuery<Row>(): AsyncIterableIterator<QueryResult<Row>> {
		throw new Error(
			"Postgres results can't be streamed: the Data API returns a result whole. Read it in parts, with a limit."
		)
	}

	async begin(settings: TransactionSettings = {}) {
		const client = await this.props.client()
		const modes = transactionModes(settings)

		this.transaction = await new Promise<OpenTransaction>((resolve, reject) => {
			const done = transact(client, session => {
				return new Promise<void>((commit, rollback) => {
					resolve({ session, commit, rollback, done })
				})
			})

			// A transaction that can't start has no session to hand over.
			done.catch(reject)
		})

		// Before its first query, where Postgres still takes them.
		if (modes.length > 0) {
			try {
				await this.transaction.session.execute(`SET TRANSACTION ${modes.join(', ')}`)
			} catch (error) {
				await this.rollback()

				throw error
			}
		}
	}

	async commit() {
		const transaction = this.transaction!
		this.transaction = undefined

		transaction.commit()
		await transaction.done
	}

	async rollback() {
		const transaction = this.transaction
		this.transaction = undefined

		transaction?.rollback(ROLLED_BACK)

		await transaction?.done.catch(error => {
			if (error !== ROLLED_BACK) {
				throw error
			}
		})
	}
}

const createDriver = (props: PostgresQueryBuilderProps): Driver => ({
	async init() {},
	// Not a real connection: the client pools its own, and the Data API has
	// none. One per transaction, to hold what's open.
	async acquireConnection() {
		return new Connection(props)
	},
	beginTransaction: (connection, settings) => (connection as Connection).begin(settings),
	commitTransaction: connection => (connection as Connection).commit(),
	rollbackTransaction: connection => (connection as Connection).rollback(),
	async releaseConnection() {},
	async destroy() {},
})

/**
 * A typed query builder on a Postgres client. Every statement goes through
 * the client, so it runs the same over a connection and through the Data API.
 */
export const postgresQueryBuilder = <Tables>(props: PostgresQueryBuilderProps) => {
	return new Kysely<Tables>({
		dialect: {
			createAdapter: () => new PostgresAdapter(),
			createDriver: () => createDriver(props),
			createIntrospector: db => new PostgresIntrospector(db),
			createQueryCompiler: () => new PostgresQueryCompiler(),
		},
	})
}
