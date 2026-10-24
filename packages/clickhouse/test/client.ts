import { ClickHouseServer } from '@awsless/clickhouse-server'
import { ClickHouseError, clickhouseClient } from '../src'

describe('clickhouseClient', () => {
	const server = new ClickHouseServer()
	let client: ReturnType<typeof clickhouseClient>

	beforeAll(async () => {
		await server.listen()
		client = clickhouseClient({ endpoint: server.endpoint })
		await client.command(
			"CREATE TABLE events (id String, projectId LowCardinality(String), flags Array(String), score Float64, createdAt DateTime64(3, 'UTC')) ENGINE = MergeTree ORDER BY (projectId, createdAt)"
		)
	})

	afterAll(async () => {
		await server.close()
	})

	it('inserts rows & reads them back as objects', async () => {
		await client.insert('events', [
			{ id: 'a', projectId: 'p1', flags: ['vpn'], score: 3, createdAt: new Date('2026-10-24T07:00:00.123Z') },
			{ id: 'b', projectId: 'p1', flags: [], score: 0, createdAt: new Date('2026-10-24T08:00:00Z') },
			{ id: 'c', projectId: 'p2', flags: ['tor', 'vpn'], score: 6, createdAt: new Date('2026-10-23T23:30:00Z') },
		])

		const rows = await client.query(
			'SELECT id, flags, createdAt FROM events WHERE projectId = {projectId:String} ORDER BY id',
			{
				projectId: 'p1',
			}
		)

		expect(rows).toEqual([
			{ id: 'a', flags: ['vpn'], createdAt: '2026-10-24T07:00:00.123Z' },
			{ id: 'b', flags: [], createdAt: '2026-10-24T08:00:00.000Z' },
		])
	})

	it('binds arrays, dates & time zones as parameters', async () => {
		const rows = await client.query<{ day: string; count: number }>(
			`SELECT toString(toDate(createdAt, {zone:String})) AS day, count() AS count
			FROM events
			WHERE hasAny(flags, {flags:Array(String)}) AND createdAt >= {from:DateTime64(3)}
			GROUP BY day ORDER BY day`,
			{ zone: 'Europe/Amsterdam', flags: ['vpn'], from: new Date('2026-10-23T00:00:00Z') }
		)

		// 23:30 UTC is already the next day in Amsterdam.
		expect(rows).toEqual([{ day: '2026-10-24', count: 2 }])
	})

	it('inserts asynchronously', async () => {
		await client.insert('events', [{ id: 'd', projectId: 'p3', flags: [], score: 1, createdAt: new Date() }], {
			async: true,
		})

		expect(await client.query('SELECT id FROM events WHERE projectId = {p:String}', { p: 'p3' })).toEqual([
			{ id: 'd' },
		])
	})

	it('keeps values out of the sql', async () => {
		const rows = await client.query('SELECT {value:String} AS value', { value: "'); DROP TABLE events; --" })

		expect(rows).toEqual([{ value: "'); DROP TABLE events; --" }])
		expect(await client.query('SELECT count() AS count FROM events')).toEqual([{ count: 4 }])
	})

	it('throws server errors with their code', async () => {
		const error = await client.query('SELECT * FROM missing').catch(error => error)

		expect(error).toBeInstanceOf(ClickHouseError)
		expect(error.code).toBe('60')
	})

	it('fetches a password function once', async () => {
		let calls = 0
		const other = clickhouseClient({
			endpoint: server.endpoint,
			password: async () => {
				calls++
				return ''
			},
		})

		await other.query('SELECT 1')
		await other.query('SELECT 1')

		expect(calls).toBe(1)
	})
})
