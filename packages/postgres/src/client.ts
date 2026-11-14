import { Pool, types } from 'pg'
import { FIRST_OWN_OID, SUPPORTED_TYPES } from './result'
import { MAX_RESULT_BYTES, renderQuery, STATEMENT_TIMEOUT } from './statement'
import { assertIdentifier, createError, type PostgresClient, registerTransaction } from './transport'

export type PostgresClientProps = {
	// Like postgres://user:password@host:5432/database, without parameters.
	url: string
	// The schema unqualified names resolve in, on every connection. The
	// public schema comes after it, for the extensions installed there.
	schema?: string
	// The most connections open at once.
	max?: number
	// Refuses what the Data API can't do, so a query that runs here also
	// runs where it travels through the Data API: one statement a call, a
	// result of types & a size it returns, done within its time limit.
	strict?: boolean
}

// The parts of a url, read here instead of by pg, which would take
// parameters like sslmode from it.
const parseUrl = (url: string) => {
	// Never the url itself in the error, nor the one URL throws: it can
	// hold a password.
	const invalid = () => {
		return new TypeError(
			'A Postgres url looks like postgres://user:password@host:5432/database, without parameters.'
		)
	}

	if (!URL.canParse(url)) {
		throw invalid()
	}

	const { protocol, hostname, port, username, password, pathname, search } = new URL(url)

	if (!/^postgres(ql)?:$/.test(protocol) || search) {
		throw invalid()
	}

	return {
		host: hostname.replace(/^\[|\]$/g, '') || undefined,
		port: port ? Number(port) : undefined,
		user: decodeURIComponent(username) || undefined,
		password: decodeURIComponent(password) || undefined,
		database: decodeURIComponent(pathname.slice(1)) || undefined,
	}
}

// A pool of connections behind one query call. It opens them on first
// use, at most `max` at once.
export const postgresClient = (props: PostgresClientProps): PostgresClient => {
	const schema = props.schema ? assertIdentifier(props.schema) : undefined
	const url = parseUrl(props.url)

	let pool: Pool | undefined

	// Set as a connection starts, so no query runs before them.
	const settings = [
		schema ? `-c search_path=${schema},public` : '',
		props.strict ? `-c statement_timeout=${STATEMENT_TIMEOUT * 1000}` : '',
	]

	const getPool = () => {
		if (!pool) {
			pool = new Pool({
				...url,
				max: props.max ?? 4,
				// Unused connections stay open until close.
				idleTimeoutMillis: 0,
				// Unused connections never keep a script or a test worker alive.
				allowExitOnIdle: true,
				options: settings.filter(Boolean).join(' ') || undefined,
			})

			// The pool drops an unused connection that the server closed &
			// opens another for the next query. Unheard, its error would
			// take the process down.
			pool.on('error', () => {})
		}

		return pool
	}

	// Whether the Data API returns a type that an app or an extension
	// made: an enum & a vector do come back, as text.
	const ownTypes = new Map<number, Promise<boolean>>()

	const isReturnedOwnType = (oid: number) => {
		let isReturned = ownTypes.get(oid)

		if (!isReturned) {
			isReturned = getPool()
				.query<{ name: string; kind: string }>(
					'SELECT typname AS name, typtype AS kind FROM pg_type WHERE oid = $1',
					[oid]
				)
				.then(({ rows: [type] }) => type?.kind === 'e' || type?.name === 'vector')

			ownTypes.set(oid, isReturned)
		}

		return isReturned
	}

	// A query the way the Data API would take it: what it refuses is
	// refused here, with the same SQLSTATE.
	const queryStrictly = async (sql: string, params?: unknown[]) => {
		// One statement, parameters that match & a size that fits.
		renderQuery(sql, params)

		let bytes = 0

		const result = await getPool().query({
			text: sql,
			values: params,
			types: {
				getTypeParser(oid: number, format?: 'text' | 'binary') {
					const parse = types.getTypeParser(oid, format as 'text')

					// Counts what the server sent, before it is parsed.
					return (value: string) => {
						bytes += Buffer.byteLength(value)

						return parse(value)
					}
				},
			},
		})

		for (const field of result.fields) {
			const returned =
				SUPPORTED_TYPES.has(field.dataTypeID) ||
				(field.dataTypeID >= FIRST_OWN_OID && (await isReturnedOwnType(field.dataTypeID)))

			if (!returned) {
				throw createError(
					'0A000',
					`The Data API can't return the type of column "${field.name}". Cast it to text in the query, like ${field.name}::text.`
				)
			}

			// An array of arrays is one more thing it can't return.
			if (result.rows.some(row => Array.isArray(row[field.name]) && row[field.name].some(Array.isArray))) {
				throw createError(
					'0A000',
					`The Data API can't return column "${field.name}": an array with more than one dimension. Return it as jsonb.`
				)
			}
		}

		if (bytes > MAX_RESULT_BYTES) {
			throw createError(
				'54000',
				`The result is ${bytes} bytes, over the ${MAX_RESULT_BYTES} the Data API returns. Read it in parts, with a LIMIT.`
			)
		}

		return result
	}

	const client: PostgresClient = {
		async query<Row = Record<string, unknown>>(sql: string, params?: unknown[]) {
			const result = props.strict ? await queryStrictly(sql, params) : await getPool().query(sql, params)

			// Several statements in one call answer with the rows of the last.
			return ((Array.isArray(result) ? result.at(-1)?.rows : result.rows) ?? []) as Row[]
		},

		async close() {
			const current = pool
			pool = undefined
			await current?.end()
		},
	}

	// One connection for the whole transaction.
	registerTransaction(client, async run => {
		const connection = await getPool().connect()
		let broken = false

		try {
			await connection.query('BEGIN')

			const result = await run({
				query: async sql => (await connection.query(sql)).rows,
			})

			await connection.query('COMMIT')

			return result
		} catch (error) {
			// A connection that can't roll back never serves another query.
			await connection.query('ROLLBACK').catch(() => {
				broken = true
			})

			throw error
		} finally {
			connection.release(broken)
		}
	})

	return client
}
