import { define, mockDynamoDB, number, object, pagination, putItem } from '../../src/index'

describe('Pagination', () => {

	const posts = define('posts', {
		hash: 'userId',
		sort: 'id',
		schema: object({
			userId: number(),
			sortId: number(),
			id: number(),
		}),
		indexes: {
			list: { hash: 'userId', sort: 'sortId' }
		}
	})

	mockDynamoDB({ tables: [ posts ] })

	it('should pagination list', async () => {
		await Promise.all([
			putItem(posts, { userId: 1, id: 1, sortId: 1 }),
			putItem(posts, { userId: 1, id: 2, sortId: 2 }),
			putItem(posts, { userId: 1, id: 3, sortId: 3 }),
		])

		const result = await pagination(posts, {
			keyCondition: (exp) => exp.where('userId').eq(1),
		})

		expect(result).toStrictEqual({
			cursor: undefined,
			count: 3,
			items: [
				{ userId: 1, sortId: 1, id: 1 },
				{ userId: 1, sortId: 2, id: 2 },
				{ userId: 1, sortId: 3, id: 3 },
			],
		})
	})

	it('should pagination list backwards', async () => {
		const result = await pagination(posts, {
			keyCondition: (exp) => exp.where('userId').eq(1),
			forward: false,
		})

		expect(result).toStrictEqual({
			cursor: undefined,
			count: 3,
			items: [
				{ userId: 1, sortId: 3, id: 3 },
				{ userId: 1, sortId: 2, id: 2 },
				{ userId: 1, sortId: 1, id: 1 },
			],
		})
	})

	it('should support limit & cursor', async () => {
		const result1 = await pagination(posts, {
			keyCondition: (exp) => exp.where('userId').eq(1),
			limit: 1,
		})

		expectTypeOf(result1.cursor!).toBeString()

		expect(result1).toStrictEqual({
			count: 1,
			cursor: expect.any(String),
			items: [
				{ userId: 1, sortId: 1, id: 1 },
			],
		})

		const result2 = await pagination(posts, {
			keyCondition: (exp) => exp.where('userId').eq(1),
			cursor: result1.cursor,
			limit: 1,
		})

		expect(result2).toStrictEqual({
			count: 1,
			cursor: expect.any(String),
			items: [
				{ userId: 1, sortId: 2, id: 2 },
			],
		})
	})

	it('should support index', async () => {
		const result = await pagination(posts, {
			index: 'list',
			keyCondition: (exp) => exp
				.where('userId').eq(1)
				.and
				.where('sortId').eq(1)
		})

		expect(result).toStrictEqual({
			cursor: undefined,
			count: 1,
			items: [
				{ userId: 1, sortId: 1, id: 1 },
			],
		})
	})

	it('should not return cursor when no more items are available', async () => {
		const result = await pagination(posts, {
			keyCondition: (exp) => exp.where('userId').eq(1),
			limit: 3,
		})

		expect(result.items.length).toBe(3)
		expect(result.cursor).toBeUndefined()
	})
})
