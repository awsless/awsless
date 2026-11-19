import { PostgresServer } from '@awsless/postgres-server'
import { getSqlState, postgresClient, PostgresError } from '../src'

describe('postgresClient', () => {
	const server = new PostgresServer()
	let client: ReturnType<typeof postgresClient>

	beforeAll(async () => {
		await server.listen()
		client = postgresClient({ url: server.url })
		await client.query('CREATE TABLE notes (id int PRIMARY KEY, body text NOT NULL, tags text[] NOT NULL)')
	})

	afterAll(async () => {
		await client.close()
		await server.close()
	})

	it('binds params & reads rows back as objects', async () => {
		await client.query('INSERT INTO notes VALUES ($1, $2, $3), ($4, $5, $6)', [
			1,
			"it's",
			['a', 'b'],
			2,
			'second',
			[],
		])

		const rows = await client.query<{ id: number; body: string; tags: string[] }>(
			'SELECT id, body, tags FROM notes WHERE id = ANY($1) ORDER BY id',
			[[1, 2]]
		)

		expect(rows).toEqual([
			{ id: 1, body: "it's", tags: ['a', 'b'] },
			{ id: 2, body: 'second', tags: [] },
		])
		expect(await client.query('SELECT id FROM notes WHERE id = $1', [3])).toEqual([])
	})

	it('answers a call of several statements with the rows of the last', async () => {
		expect(await client.query('SELECT 1 AS first; SELECT 2 AS last')).toEqual([{ last: 2 }])
	})

	it('runs queries at once on connections of their own, up to max', async () => {
		const pooled = postgresClient({ url: server.url, max: 2 })
		const started = Date.now()
		const rows = await Promise.all(
			[1, 2, 3, 4].map(() => pooled.query<{ pid: number }>('SELECT pg_sleep(0.2), pg_backend_pid() AS pid'))
		)

		// Four queries of 200 ms on two connections take two rounds.
		expect(Date.now() - started).toBeGreaterThanOrEqual(380)
		expect(Date.now() - started).toBeLessThan(750)
		expect(new Set(rows.map(([row]) => row!.pid)).size).toBe(2)

		await pooled.close()
	})

	it('takes a url without parameters', () => {
		expect(() => postgresClient({ url: `${server.url}?sslmode=require` })).toThrow(TypeError)
		expect(() => postgresClient({ url: 'mysql://localhost/app' })).toThrow(TypeError)
		// A url that can't be read never shows up in the error, password & all.
		expect(() => postgresClient({ url: 'postgres://app:secret@:not-a-port/app' })).toThrow(
			'A Postgres url looks like'
		)
	})

	it('opens no connection before the first query', async () => {
		const lazy = postgresClient({ url: 'postgres://postgres:postgres@127.0.0.1:1/postgres' })

		await expect(lazy.query('SELECT 1')).rejects.toThrow()
		await lazy.close()
	})

	it('resolves unqualified names in its schema', async () => {
		await client.query('CREATE SCHEMA one; CREATE SCHEMA two')

		const one = postgresClient({ url: server.url, schema: 'one' })
		const two = postgresClient({ url: server.url, schema: 'two' })

		await one.query('CREATE TABLE items (name text)')
		await two.query('CREATE TABLE items (name text)')
		await one.query("INSERT INTO items VALUES ('from one')")

		// Every connection of a pool uses the schema, not only its first.
		const names = await Promise.all([1, 2, 3].map(() => one.query('SELECT pg_sleep(0.05), name FROM items')))

		expect(names.map(([row]) => row!.name)).toEqual(['from one', 'from one', 'from one'])
		expect(await two.query('SELECT name FROM items')).toEqual([])
		expect(await client.query('SELECT count(*)::int AS count FROM one.items')).toEqual([{ count: 1 }])
		await expect(client.query('SELECT name FROM items')).rejects.toThrow('relation "items" does not exist')
		expect(() => postgresClient({ url: server.url, schema: 'not-valid' })).toThrow(TypeError)

		await Promise.all([one.close(), two.close()])
	})

	it('replaces a connection the server closed', async () => {
		const pooled = postgresClient({ url: server.url, max: 1 })
		const [before] = await pooled.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')

		await client.query('SELECT pg_terminate_backend($1)', [before!.pid])
		await new Promise(resolve => setTimeout(resolve, 100))

		const [after] = await pooled.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')

		expect(after!.pid).not.toBe(before!.pid)

		await pooled.close()
	})

	it('keeps a wrong password an error', async () => {
		const wrong = postgresClient({ url: `postgres://postgres:wrong@${server.host}:${server.port}/postgres` })
		const error = await wrong.query('SELECT 1').catch(error => error)

		expect(error).toBeInstanceOf(PostgresError)
		expect(getSqlState(error)).toBe('28P01')

		await wrong.close()
	})

	it('reads the SQLSTATE of a failed query', async () => {
		const duplicate = await client
			.query('INSERT INTO notes VALUES (1, $1, $2)', ['again', []])
			.catch(error => error)

		expect(duplicate).toBeInstanceOf(PostgresError)
		expect(getSqlState(duplicate)).toBe('23505')
		expect(getSqlState(new Error('other'))).toBeUndefined()
		expect(getSqlState(Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }))).toBeUndefined()
	})

	it('tells a deadlock by its SQLSTATE', async () => {
		await client.query(
			'CREATE TABLE locks (id int PRIMARY KEY, value int); INSERT INTO locks VALUES (1, 0), (2, 0)'
		)
		await client.query(`
			CREATE FUNCTION lock_both(first int, second int) RETURNS void LANGUAGE plpgsql AS $$
			BEGIN
				UPDATE locks SET value = value + 1 WHERE id = first;
				PERFORM pg_sleep(0.3);
				UPDATE locks SET value = value + 1 WHERE id = second;
			END $$
		`)

		const results = await Promise.allSettled([
			client.query('SELECT lock_both(1, 2)'),
			client.query('SELECT lock_both(2, 1)'),
		])
		const failed = results.filter(result => result.status === 'rejected')

		expect(failed).toHaveLength(1)
		expect(getSqlState(failed[0]!.reason)).toBe('40P01')
	})

	it('opens a new pool after close', async () => {
		const reused = postgresClient({ url: server.url })

		await reused.query('SELECT 1')
		await reused.close()

		expect(await reused.query('SELECT 1 AS one')).toEqual([{ one: 1 }])

		await reused.close()
	})

	// What a stack's code runs on locally: a connection that takes no more
	// than the Data API does where the stack is deployed.
	describe('strict', () => {
		let strict: ReturnType<typeof postgresClient>

		beforeAll(async () => {
			await client.query("CREATE TYPE link_state AS ENUM ('open', 'closed')")

			strict = postgresClient({ url: server.url, strict: true })
		})

		afterAll(async () => {
			await strict.close()
		})

		it('runs what the Data API runs, with the same rows', async () => {
			expect(
				await strict.query('SELECT $1::int AS n, $2 AS name, $3::timestamptz AS at, $4::jsonb AS meta', [
					7,
					'user-1042',
					new Date('2026-11-13T10:00:00Z'),
					'{"a":1}',
				])
			).toEqual([{ n: 7, name: 'user-1042', at: new Date('2026-11-13T10:00:00Z'), meta: { a: 1 } }])
		})

		it('takes one statement a call', async () => {
			await expect(strict.query('SELECT 1; SELECT 2')).rejects.toThrow('A query is one statement')
			expect(await strict.query('SELECT 1 AS one;')).toEqual([{ one: 1 }])
		})

		it('wants a parameter for every placeholder, and no more', async () => {
			await expect(strict.query('SELECT $1, $2', [1])).rejects.toThrow(
				'2 placeholders, up to $2, but 1 parameters'
			)
			await expect(strict.query('SELECT 1', [1])).rejects.toThrow('0 placeholders')
		})

		it('refuses a query with more text than the Data API takes', async () => {
			await expect(strict.query('SELECT $1 AS big', ['x'.repeat(70_000)])).rejects.toThrow(
				'over the 65536 the Data API takes'
			)
			expect(await strict.query('SELECT length($1::text) AS length', ['x'.repeat(70_000)])).toEqual([
				{ length: 70_000 },
			])
		})

		it('refuses a column of a type the Data API has no way to return', async () => {
			const refused = async (sql: string) => {
				const error = await strict.query(sql).catch(error => error)

				expect(error).toBeInstanceOf(PostgresError)
				expect(getSqlState(error)).toBe('0A000')

				return error.message as string
			}

			expect(await refused("SELECT '{[2026-11-01,2026-11-02)}'::datemultirange AS days")).toBe(
				'The Data API can\'t return the type of column "days". Cast it to text in the query, like days::text.'
			)
			await refused("SELECT '[1,2)'::int4range AS range")
			await refused("SELECT '1 day'::interval AS span")
			await refused('SELECT ROW(1, 2) AS pair')
			await refused("SELECT '{{1,2},{3,4}}'::int[] AS grid")
			await refused("SELECT ARRAY['2026-11-13 10:00:00+00'::timestamptz] AS moments")

			expect(await strict.query("SELECT '{[2026-11-01,2026-11-02)}'::datemultirange::text AS days")).toEqual([
				{ days: '{[2026-11-01,2026-11-02)}' },
			])
		})

		it('returns an enum, as its text', async () => {
			expect(await strict.query("SELECT 'open'::link_state AS state")).toEqual([{ state: 'open' }])
		})

		it('refuses a result of over a megabyte', async () => {
			const error = await strict
				.query("SELECT repeat('x', 300000) AS big FROM generate_series(1, 4)")
				.catch(error => error)

			expect(getSqlState(error)).toBe('54000')
			expect(error.message).toBe(
				'The result is 1200000 bytes, over the 1048576 the Data API returns. Read it in parts, with a LIMIT.'
			)
			expect(await strict.query("SELECT repeat('x', 300000) AS big FROM generate_series(1, 3)")).toHaveLength(3)
		})

		it('gives a statement 45 seconds', async () => {
			expect(await strict.query("SELECT current_setting('statement_timeout') AS timeout")).toEqual([
				{ timeout: '45s' },
			])
			expect(await client.query("SELECT current_setting('statement_timeout') AS timeout")).toEqual([
				{ timeout: '0' },
			])
		})
	})
})
