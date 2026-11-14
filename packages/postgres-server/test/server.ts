import { spawnSync } from 'child_process'
import { readFile, stat } from 'fs/promises'
import { join } from 'path'
import pg from 'pg'
import { PostgresServer } from '../src'

const connect = async (url: string) => {
	const client = new pg.Client({ connectionString: url })

	await client.connect()

	return client
}

const getDataDir = async (url: string) => {
	const client = await connect(url)
	const { rows } = await client.query("SELECT current_setting('data_directory') AS dir")

	await client.end()

	return rows[0].dir as string
}

describe('PostgresServer', () => {
	const server = new PostgresServer()

	beforeAll(async () => {
		await server.listen()
	})

	afterAll(async () => {
		await server.close()
	})

	it('runs Postgres 17 in UTC on a free port', async () => {
		const client = await connect(server.url)
		const { rows } = await client.query(
			"SELECT current_setting('server_version_num')::int AS version, current_setting('TimeZone') AS zone"
		)

		await client.end()

		expect(server.url).toBe(`postgres://postgres:postgres@127.0.0.1:${server.port}/postgres`)
		expect(rows[0].version).toBeGreaterThanOrEqual(170000)
		expect(rows[0].version).toBeLessThan(180000)
		expect(rows[0].zone).toBe('UTC')
	})

	it('answers two connections at once', async () => {
		const [first, second] = await Promise.all([connect(server.url), connect(server.url)])

		// Each query sleeps on its own connection, so together they take the
		// time of one.
		const started = Date.now()
		const results = await Promise.all([
			first.query('SELECT pg_sleep(0.3), pg_backend_pid() AS pid'),
			second.query('SELECT pg_sleep(0.3), pg_backend_pid() AS pid'),
		])

		await Promise.all([first.end(), second.end()])

		expect(Date.now() - started).toBeLessThan(550)
		expect(results[0].rows[0].pid).not.toBe(results[1].rows[0].pid)
	})

	it('sorts & cases text the same on every machine', async () => {
		const client = await connect(server.url)
		const { rows } = await client.query(
			"SELECT array_agg(x ORDER BY x) AS sorted, upper('é') AS upper FROM unnest(ARRAY['b', 'A', 'a', 'B', 'é', 'e', 'Z']) x"
		)

		await client.end()

		expect(rows[0]).toEqual({ sorted: ['a', 'A', 'b', 'B', 'e', 'é', 'Z'], upper: 'É' })
	})

	it('removes its temporary data & stops listening on close', async () => {
		const other = new PostgresServer()

		await other.listen()

		const url = other.url
		const client = await connect(url)
		const { rows } = await client.query("SELECT current_setting('data_directory') AS dir")

		await client.end()
		await other.close()

		await expect(stat(rows[0].dir)).rejects.toThrow()
		await expect(connect(url)).rejects.toThrow()
	})

	it('streams its log', async () => {
		const lines: string[] = []
		const other = new PostgresServer({ onOutput: line => lines.push(line) })

		await other.listen()

		const client = await connect(other.url)

		// A statement that fails shows up in the server log.
		await expect(client.query('SELECT * FROM missing')).rejects.toThrow()
		await client.end()
		await other.close()

		expect(lines.join('\n')).toContain('relation "missing" does not exist')
	})

	it('reports a server that dies', async () => {
		const exits: (number | null)[] = []
		const other = new PostgresServer({ onExit: code => exits.push(code) })

		await other.listen()

		const client = await connect(other.url)
		const { rows } = await client.query("SELECT current_setting('data_directory') AS dir")
		const [pid] = (await readFile(join(rows[0].dir, 'postmaster.pid'), 'utf8')).split('\n')

		client.on('error', () => {})
		process.kill(Number(pid), 'SIGQUIT')

		await vi.waitFor(() => expect(exits).toHaveLength(1), { timeout: 10_000 })
		await other.close()
	})
})

describe('PostgresServer after a parent that was killed', () => {
	it('stops & removes the temporary server it left running', async () => {
		const pid = process.pid
		// A process that is gone, like a parent that was killed hard, in whose
		// name a server starts.
		const dead = spawnSync(process.execPath, ['-e', '']).pid
		const exits: (number | null)[] = []
		const orphan = new PostgresServer({ onExit: code => exits.push(code) })

		Object.defineProperty(process, 'pid', { value: dead, configurable: true })

		try {
			await orphan.listen()
		} finally {
			Object.defineProperty(process, 'pid', { value: pid, configurable: true })
		}

		const orphanDir = await getDataDir(orphan.url)

		expect(orphanDir).toContain(`awsless-postgres-${dead}-`)

		const next = new PostgresServer()

		await next.listen()
		await vi.waitFor(() => expect(exits).toHaveLength(1), { timeout: 10_000 })

		await expect(stat(orphanDir)).rejects.toThrow()

		// A directory of a process that still runs stays.
		const nextDir = await getDataDir(next.url)
		const other = new PostgresServer()

		await other.listen()
		await expect(stat(nextDir)).resolves.toBeDefined()

		await Promise.all([other.close(), next.close(), orphan.close()])
	})
})
