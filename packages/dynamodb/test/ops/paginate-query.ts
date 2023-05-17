import { bigint, define, mockDynamoDB, number, object, paginateQuery, putItem } from '../../dist/index'

describe('Paginate Query', () => {
	const posts = define('posts', {
		hash: 'userId',
		sort: 'id',
		schema: object({
			userId: number(),
			sortId: number(),
			id: bigint(),
		}),
		indexes: {
			list: { hash: 'userId', sort: 'sortId' },
		},
	})

	mockDynamoDB({ tables: [posts] })

	it('should pagination list', async () => {
		await Promise.all([
			putItem(posts, { userId: 1, id: 1n, sortId: 1 }),
			putItem(posts, { userId: 1, id: 2n, sortId: 2 }),
			putItem(posts, { userId: 1, id: 3n, sortId: 3 }),
		])

		const result = await paginateQuery(posts, {
			keyCondition: exp => exp.where('userId').eq(1),
		})

		expect(result).toStrictEqual({
			cursor: undefined,
			count: 3,
			items: [
				{ userId: 1, sortId: 1, id: 1n },
				{ userId: 1, sortId: 2, id: 2n },
				{ userId: 1, sortId: 3, id: 3n },
			],
		})
	})

	it('should pagination list backwards', async () => {
		const result = await paginateQuery(posts, {
			keyCondition: exp => exp.where('userId').eq(1),
			forward: false,
		})

		expect(result).toStrictEqual({
			cursor: undefined,
			count: 3,
			items: [
				{ userId: 1, sortId: 3, id: 3n },
				{ userId: 1, sortId: 2, id: 2n },
				{ userId: 1, sortId: 1, id: 1n },
			],
		})
	})

	it('should support limit & cursor', async () => {
		const result1 = await paginateQuery(posts, {
			keyCondition: exp => exp.where('userId').eq(1),
			limit: 1,
		})

		expectTypeOf(result1.cursor!).toBeString()

		expect(result1).toStrictEqual({
			count: 1,
			cursor: expect.any(String),
			items: [{ userId: 1, sortId: 1, id: 1n }],
		})

		const result2 = await paginateQuery(posts, {
			keyCondition: exp => exp.where('userId').eq(1),
			cursor: result1.cursor,
			limit: 1,
		})

		expect(result2).toStrictEqual({
			count: 1,
			cursor: expect.any(String),
			items: [{ userId: 1, sortId: 2, id: 2n }],
		})
	})

	it('should support index', async () => {
		const result = await paginateQuery(posts, {
			index: 'list',
			keyCondition: exp => exp.where('userId').eq(1).and.where('sortId').eq(1),
		})

		expect(result).toStrictEqual({
			cursor: undefined,
			count: 1,
			items: [{ userId: 1, sortId: 1, id: 1n }],
		})
	})

	it('should not return cursor when no more items are available', async () => {
		const result = await paginateQuery(posts, {
			keyCondition: exp => exp.where('userId').eq(1),
			limit: 3,
		})

		expect(result.items.length).toBe(3)
		expect(result.cursor).toBeUndefined()
	})
})
