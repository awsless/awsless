import { ClickHouseEngineKind, ClickHouseServer } from '../src'

const engines: ClickHouseEngineKind[] = [
	'memory',
	...(process.env.AWSLESS_LOCAL_ENGINE === 'real' ? (['clickhouse'] as const) : []),
]

describe.each(engines)('ClickHouseServer (%s)', engine => {
	const server = new ClickHouseServer({ engine })

	beforeAll(async () => {
		await server.listen()
	})

	afterAll(async () => {
		await server.close()
	})

	const query = async (sql: string) => {
		const response = await fetch(server.endpoint, { method: 'POST', body: sql })
		const text = await response.text()

		if (!response.ok) {
			throw new Error(text)
		}

		return text.trim()
	}

	it('answers queries over http', async () => {
		expect(await query('SELECT 1 + 1')).toBe('2')
		expect(await (await fetch(`${server.endpoint}/ping`)).text()).toBe('Ok.\n')
	})

	it('drops every table on reset', async () => {
		await query('CREATE TABLE `stack--events` (id String) ENGINE = MergeTree ORDER BY id')
		await query("INSERT INTO `stack--events` VALUES ('a')")

		expect(await query('SELECT count() FROM `stack--events`')).toBe('1')

		await server.reset()

		expect(await query('SELECT count() FROM system.tables WHERE database = currentDatabase()')).toBe('0')
	})

	it('stops listening on close', async () => {
		const other = new ClickHouseServer({ engine })

		await other.listen()
		const port = other.port
		await other.close()

		await expect(fetch(`http://127.0.0.1:${port}/ping`)).rejects.toThrow()
	})
})
