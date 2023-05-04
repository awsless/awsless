import { define, mockDynamoDB, number, object, paginateScan, putItem } from '../../src/index'

describe('Paginate Scan', () => {

	const posts = define('posts', {
		hash: 'id',
		schema: object({
			id: number(),
		}),
	})

	mockDynamoDB({ tables: [ posts ] })

	it('should pagination list', async () => {
		await putItem(posts, { id: 1 })
		await putItem(posts, { id: 2 })
		await putItem(posts, { id: 3 })

		const result = await paginateScan(posts)

		expect(result).toStrictEqual({
			cursor: undefined,
			count: 3,
			items: [
				{ id: 2 },
				{ id: 1 },
				{ id: 3 },
			],
		})
	})

	it('should support limit & cursor', async () => {
		const result1 = await paginateScan(posts, {
			limit: 1,
		})

		expectTypeOf(result1.cursor!).toBeString()

		expect(result1).toStrictEqual({
			count: 1,
			cursor: expect.any(String),
			items: [
				{ id: 2 },
			],
		})

		const result2 = await paginateScan(posts, {
			cursor: result1.cursor,
			limit: 1,
		})

		expect(result2).toStrictEqual({
			count: 1,
			cursor: expect.any(String),
			items: [
				{ id: 1 },
			],
		})
	})

	it('should not return cursor when no more items are available', async () => {
		const result = await paginateScan(posts, {
			limit: 3,
		})

		expect(result.items.length).toBe(3)
		expect(result.cursor).toBeUndefined()
	})
})
