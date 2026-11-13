import { DatabaseError } from 'pg'

export type PostgresClient = {
	// Rows as objects. Placeholders like $1 take their values from params.
	query<Row = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<Row[]>
	close(): Promise<void>
}

export { DatabaseError as PostgresError }

// The SQLSTATE of a failed query, like "40P01" for a deadlock or "23505"
// for a unique violation. Undefined for anything Postgres didn't answer.
export const getSqlState = (error: unknown): string | undefined => {
	return error instanceof DatabaseError ? error.code : undefined
}

// An error the way Postgres would have answered it, for what a transport
// refuses itself: callers read one kind of error whichever way a query ran.
export const createError = (code: string, message: string, fields: Partial<DatabaseError> = {}): DatabaseError => {
	return Object.assign(new DatabaseError(message, message.length, 'error'), { severity: 'ERROR', code, ...fields })
}

// Names that go into sql & connection settings as written.
export const assertIdentifier = (name: string) => {
	if (!/^[a-z0-9_]{1,63}$/.test(name)) {
		throw new TypeError(`"${name}" can't be a Postgres name: use up to 63 lowercase letters, digits & underscores.`)
	}

	return name
}

// One statement at a time inside a transaction, without parameters: what
// both a connection and the Data API can do.
export type Session = {
	query: (sql: string) => Promise<Record<string, unknown>[]>
}

// Runs the work in one transaction: committed when it returns, rolled
// back when it throws.
export type Transaction = <T>(run: (session: Session) => Promise<T>) => Promise<T>

const transactions = new WeakMap<PostgresClient, Transaction>()

export const registerTransaction = (client: PostgresClient, transaction: Transaction) => {
	transactions.set(client, transaction)
}

export const transact = <T>(client: PostgresClient, run: (session: Session) => Promise<T>) => {
	const transaction = transactions.get(client)

	if (!transaction) {
		return Promise.reject(new TypeError('The client was not made by postgresClient or postgresDataClient.'))
	}

	return transaction(run)
}
