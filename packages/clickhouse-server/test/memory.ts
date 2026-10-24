import { MemoryClickHouseServer } from '../src'

describe('MemoryClickHouseServer', () => {
	it('takes inserts of hundreds of thousands of rows', () => {
		const server = new MemoryClickHouseServer()
		const rows = Array.from({ length: 300_000 }, (_, index) => JSON.stringify({ id: `r${index}` })).join('\n')

		server.query('CREATE TABLE big (id String) ENGINE = MergeTree ORDER BY id')
		server.query(`INSERT INTO big FORMAT JSONEachRow\n${rows}`)

		expect(server.query('SELECT count() FROM big').result?.rows).toEqual([[300_000]])
	})
})
