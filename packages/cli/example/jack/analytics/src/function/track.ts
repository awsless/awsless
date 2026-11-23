import { ClickHouse, h, v } from 'awsless'

// A typed insert: the columns & their types come from the stack file. Rows
// travel to ClickHouse as rows, not as sql.
export default h.func(
	v.object({
		path: v.string(),
		visitor: v.string(),
		duration: v.number(),
		referrer: v.optional(v.string()),
	}),
	async ({ path, visitor, duration, referrer }) => {
		await ClickHouse.db
			.insertInto('analytics.page-views')
			.values({ path, visitor, duration, referrer, viewedAt: new Date() })
			.execute()
	}
)
