import { define, mockDynamoDB, number, object, putItem, query } from '../../src/index'

describe('Query', () => {
	const posts = define('posts', {
		hash: 'userId',
		sort: 'id',
		schema: object({
			userId: number(),
			sortId: number(),
			id: number(),
		}),
		indexes: {
			list: { hash: 'userId', sort: 'sortId' },
		},
	})

	mockDynamoDB({ tables: [posts] })

	it('should query list', async () => {
		await Promise.all([
			putItem(posts, { userId: 1, id: 1, sortId: 1 }),
			putItem(posts, { userId: 1, id: 2, sortId: 2 }),
			putItem(posts, { userId: 1, id: 3, sortId: 3 }),
		])

		const result = await query(posts, { userId: 1 })

		expect(result).toStrictEqual({
			cursor: undefined,
			items: [
				{ userId: 1, sortId: 1, id: 1 },
				{ userId: 1, sortId: 2, id: 2 },
				{ userId: 1, sortId: 3, id: 3 },
			],
		})
	})

	it('should allow sort key inside the key', async () => {
		const result = await query(posts, { userId: 1, id: 1 })

		expect(result).toStrictEqual({
			cursor: undefined,
			items: [{ userId: 1, sortId: 1, id: 1 }],
		})
	})

	it('should query with projection', async () => {
		const result = await query(posts, { userId: 1 }, { select: ['id'] })

		expectTypeOf(result).toEqualTypeOf<{
			cursor?: string
			items: { id: number }[]
		}>()

		expect(result).toStrictEqual({
			cursor: undefined,
			items: [{ id: 1 }, { id: 2 }, { id: 3 }],
		})
	})

	it('should query list backwards', async () => {
		const result = await query(posts, { userId: 1 }, { order: 'desc' })

		expect(result).toStrictEqual({
			cursor: undefined,
			items: [
				{ userId: 1, sortId: 3, id: 3 },
				{ userId: 1, sortId: 2, id: 2 },
				{ userId: 1, sortId: 1, id: 1 },
			],
		})
	})

	it('should support limit & cursor', async () => {
		const result1 = await query(posts, { userId: 1 }, { limit: 1 })

		expectTypeOf(result1.cursor).toEqualTypeOf<string | undefined>()

		expect(result1).toStrictEqual({
			cursor: expect.any(String),
			items: [{ userId: 1, sortId: 1, id: 1 }],
		})

		const result2 = await query(
			posts,
			{ userId: 1 },
			{
				cursor: result1.cursor,
				limit: 1,
			}
		)

		expect(result2).toStrictEqual({
			cursor: expect.any(String),
			items: [{ userId: 1, sortId: 2, id: 2 }],
		})
	})

	it('should query on sort key', async () => {
		const result = await query(
			posts,
			{ userId: 1 },
			{
				where: e => e.id.gt(1),
			}
		)

		expect(result).toStrictEqual({
			cursor: undefined,
			items: [
				{ userId: 1, sortId: 2, id: 2 },
				{ userId: 1, sortId: 3, id: 3 },
			],
		})
	})

	it('should support index', async () => {
		const result = await query(
			posts,
			{ userId: 1 },
			{
				index: 'list',
				where: e => e.sortId.gt(0),
			}
		)

		expect(result).toStrictEqual({
			cursor: undefined,
			items: [
				{ userId: 1, sortId: 1, id: 1 },
				{ userId: 1, sortId: 2, id: 2 },
				{ userId: 1, sortId: 3, id: 3 },
			],
		})
	})

	it('should not return cursor when no more items are available', async () => {
		const result = await query(posts, { userId: 1 }, { limit: 3 })

		expect(result.items.length).toBe(3)
		expect(result.cursor).toBeUndefined()
	})

	it('should iterate over all items in the table', async () => {
		const items: any[] = []

		const iterable = query(posts, { userId: 1 }, { limit: 1 })

		for await (const batch of iterable) {
			expect(batch.length).toBeLessThanOrEqual(1)

			items.push(...batch)
		}

		expect(items).toStrictEqual([
			{ userId: 1, sortId: 1, id: 1 },
			{ userId: 1, sortId: 2, id: 2 },
			{ userId: 1, sortId: 3, id: 3 },
		])
	})
})
