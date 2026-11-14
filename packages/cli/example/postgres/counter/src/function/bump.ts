import { h, Postgres, v } from 'awsless'

export default h.func(v.object({ name: v.string() }), async ({ name }) => {
	const [row] = await Postgres.counter.query<{ value: number }>('SELECT bump($1)::int AS value', [name])

	return row!.value
})
