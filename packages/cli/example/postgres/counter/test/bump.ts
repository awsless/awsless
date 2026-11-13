import { Fn, getSqlState, Postgres } from 'awsless'

describe('counter', () => {
	it('has a schema of its own for this test file', () => {
		expect(Postgres.counter.schema).toMatch(/^app_postgres_t[a-z0-9]+__counter$/)
	})

	it('bumps through a PL/pgSQL function', async () => {
		expect(await Fn.counter.bump({ name: 'visits' })).toBe(1)
		expect(await Fn.counter.bump({ name: 'visits' })).toBe(2)

		expect(await Postgres.counter.query('SELECT name, value::int FROM counters')).toEqual([
			{ name: 'visits', value: 2 },
		])
	})

	it('runs queries at once on a few connections', async () => {
		const rows = await Promise.all(
			Array.from({ length: 12 }, () =>
				Postgres.counter.query<{ value: number; pid: number }>(
					"SELECT bump('parallel')::int AS value, pg_backend_pid() AS pid, pg_sleep(0.02)::text"
				)
			)
		)

		const values = rows.map(([row]) => row!.value).toSorted((a, b) => a - b)
		const connections = new Set(rows.map(([row]) => row!.pid)).size

		// No bump is lost, and the pool never opens more than its four.
		expect(values).toEqual(Array.from({ length: 12 }, (_, index) => index + 1))
		expect(connections).toBeGreaterThan(1)
		expect(connections).toBeLessThanOrEqual(4)
	})

	it('keeps every bump in the partition of its counter', async () => {
		for (const name of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
			await Fn.counter.bump({ name })
		}

		const partitions = await Postgres.counter.query<{ partition: string; bumps: number }>(
			'SELECT tableoid::regclass::text AS partition, count(*)::int AS bumps FROM bumps GROUP BY 1 ORDER BY 1'
		)

		expect(partitions.length).toBeGreaterThan(1)
		expect(partitions.every(row => /^bumps_p[0-3]$/.test(row.partition))).toBe(true)

		// A bump is found again by its counter, numbered by Postgres & dated by its default.
		const [bump] = await Postgres.counter.query<{
			id: number
			amount: number
			bumped_at: Date
			note: string | null
		}>("SELECT id::int, amount::int, bumped_at, note FROM bumps WHERE name = 'e'")

		expect(bump).toEqual({ id: expect.any(Number), amount: 1, bumped_at: expect.any(Date), note: null })
	})

	it('reads the SQLSTATE of a failed query', async () => {
		const error = await Postgres.counter.query("INSERT INTO counters VALUES ('visits', 1)").catch(error => error)

		expect(getSqlState(error)).toBe('23505')
	})
})
