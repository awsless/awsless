import { Postgres } from 'awsless'

describe('another test file', () => {
	it('starts from an empty schema', async () => {
		expect(await Postgres.counter.query('SELECT * FROM counters')).toEqual([])
		expect(await Postgres.counter.query("SELECT bump('visits')::int AS value")).toEqual([{ value: 1 }])
	})
})
