
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
			list: { hash: 'userId', sort: 'sortId' }
		}
	})

	mockDynamoDB({ tables: [ posts ] })

	it('should query list', async () => {
		await Promise.all([
			putItem(posts, { userId: 1, id: 1, sortId: 1 }),
			putItem(posts, { userId: 1, id: 2, sortId: 2 }),
			putItem(posts, { userId: 1, id: 3, sortId: 3 }),
		])

		const result = await query(posts, {
			keyCondition: (exp) => exp.where('userId').eq(1)
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

	it('should query list backwards', async () => {
		const result = await query(posts, {
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
		const result1 = await query(posts, {
			keyCondition: (exp) => exp.where('userId').eq(1),
			limit: 1,
		})

		expectTypeOf(result1.cursor).toMatchTypeOf<{ userId: number, id: number } | undefined>()

		expect(result1).toStrictEqual({
			count: 1,
			cursor: { userId: 1, id: 1 },
			items: [
				{ userId: 1, sortId: 1, id: 1 },
			],
		})

		const result2 = await query(posts, {
			keyCondition: (exp) => exp.where('userId').eq(1),
			cursor: result1.cursor,
			limit: 1,
		})

		expect(result2).toStrictEqual({
			count: 1,
			cursor: { userId: 1, id: 2 },
			items: [
				{ userId: 1, sortId: 2, id: 2 },
			],
		})
	})

	it('should support index', async () => {
		const result = await query(posts, {
			index: 'list',
			limit: 1,
			keyCondition: (exp) => exp
				.where('userId').eq(1)
				.and
				.where('sortId').eq(1)
		})

		expect(result).toStrictEqual({
			count: 1,
			cursor: { userId: 1, sortId: 1, id: 1 },
			items: [
				{ userId: 1, sortId: 1, id: 1 },
			],
		})
	})
})
