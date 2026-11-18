import { ClickHouse, h, v } from 'awsless'

// An aggregate over the typed table. ClickHouse counts in 64 bits, so a
// count and a sum arrive as a bigint; every value is a parameter.
export default h.func(v.object({ since: v.date(), limit: v.optional(v.number(), 10) }), async ({ since, limit }) => {
	return ClickHouse.db
		.selectFrom('analytics.page-views')
		.select(eb => [
			'path',
			eb.fn.countAll<bigint>().as('views'),
			eb.fn.agg<bigint>('uniqExact', ['visitor']).as('visitors'),
			// Not `duration`: in ClickHouse an alias takes the place of a column of its name.
			eb.fn.agg<bigint>('sum', ['duration']).as('time'),
		])
		.where('viewedAt', '>=', since)
		.groupBy('path')
		.orderBy('views', 'desc')
		.orderBy('path')
		.limit(limit)
		.execute()
})
