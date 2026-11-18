import { ClickHouse } from 'awsless'
import top from '../src/function/top'
import track from '../src/function/track'

// Every test file gets tables of its own on an in-memory ClickHouse.
describe('Analytics', () => {
	const since = new Date(Date.now() - 60_000)

	it('tracks page views', async () => {
		await track({ path: '/pricing', visitor: 'a', duration: 1200 })
		await track({ path: '/pricing', visitor: 'b', duration: 800, referrer: 'https://example.com' })
		await track({ path: '/pricing', visitor: 'a', duration: 500 })
		await track({ path: '/docs', visitor: 'a', duration: 9000 })

		const rows = await ClickHouse.db
			.selectFrom('analytics.page-views')
			.select(['visitor', 'duration', 'referrer', 'viewedAt', 'day'])
			.where('path', '=', '/docs')
			.execute()

		// Typed by the stack file: a UInt64 is a bigint, a "string?" may be null,
		// a date a Date, and the day ClickHouse filled in its text.
		expect(rows).toStrictEqual([
			{
				visitor: 'a',
				duration: 9000n,
				referrer: null,
				viewedAt: expect.any(Date),
				day: new Date().toISOString().slice(0, 10),
			},
		])
	})

	it('counts the views, visitors & time of every page', async () => {
		expect(await top({ since })).toStrictEqual([
			{ path: '/pricing', views: 3n, visitors: 2n, time: 2500n },
			{ path: '/docs', views: 1n, visitors: 1n, time: 9000n },
		])
		expect(await top({ since, limit: 1 })).toHaveLength(1)
		expect(await top({ since: new Date(Date.now() + 60_000) })).toStrictEqual([])
	})
})
