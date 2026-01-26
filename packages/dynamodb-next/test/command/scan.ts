import { mockDynamoDB, putItem, scan } from '../../src/index'
import { users } from '../aws/tables'

describe('Scan', () => {
	mockDynamoDB({ tables: [users] })

	it('should scan list', async () => {
		await Promise.all([
			putItem(users, { id: 1, name: '' }),
			putItem(users, { id: 2, name: '' }),
			putItem(users, { id: 3, name: '' }),
		])

		const result = await scan(users)

		expect(result).toStrictEqual({
			cursor: undefined,
			items: [
				{ id: 1, name: '' },
				{ id: 2, name: '' },
				{ id: 3, name: '' },
			],
		})
	})

	it('should query with projection', async () => {
		const result = await scan(users, { select: ['id'] })

		expectTypeOf(result).toEqualTypeOf<{
			cursor?: string
			items: { id: number }[]
		}>()

		expect(result).toStrictEqual({
			cursor: undefined,
			items: [{ id: 1 }, { id: 2 }, { id: 3 }],
		})
	})

	it('should support limit & cursor', async () => {
		const result1 = await scan(users, {
			limit: 1,
		})

		expectTypeOf(result1.cursor).toMatchTypeOf<string | undefined>()

		expect(result1).toStrictEqual({
			cursor: expect.any(String),
			items: [{ id: 1, name: '' }],
		})

		const result2 = await scan(users, {
			cursor: result1.cursor,
			limit: 1,
		})

		expect(result2).toStrictEqual({
			cursor: expect.any(String),
			items: [{ id: 2, name: '' }],
		})
	})

	// it('should support index', async () => {
	// 	const result = await scan(users, {
	// 		index: 'list',
	// 	})

	// 	expect(result).toStrictEqual({
	// 		cursor: undefined,
	// 		count: 3,
	// 		items: [
	// 			{ userId: 1, sortId: 1, id: 1n },
	// 			{ userId: 1, sortId: 2, id: 2n },
	// 			{ userId: 1, sortId: 3, id: 3n },
	// 		],
	// 	})
	// })

	it('should not return cursor when no more items are available', async () => {
		const result = await scan(users, {
			limit: 3,
		})

		expect(result.items.length).toBe(3)
		expect(result.cursor).toBeUndefined()
	})

	it('should iterate over all items in the table', async () => {
		const items: any[] = []

		const iterable = scan(users, { limit: 1 })

		for await (const batch of iterable) {
			expect(batch.length).toBeLessThanOrEqual(1)

			items.push(...batch)
		}

		expect(items).toStrictEqual([
			{ id: 1, name: '' },
			{ id: 2, name: '' },
			{ id: 3, name: '' },
		])
	})

	it('should iterate over all items in the table with high limit', async () => {
		const items: any[] = []

		const iterable = scan(users, { limit: 100 })

		for await (const batch of iterable) {
			expect(batch.length).toBeLessThanOrEqual(3)

			items.push(...batch)
		}

		expect(items).toStrictEqual([
			{ id: 1, name: '' },
			{ id: 2, name: '' },
			{ id: 3, name: '' },
		])
	})
})
