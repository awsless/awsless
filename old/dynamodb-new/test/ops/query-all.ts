import { define, mockDynamoDB, number, object, queryAll, seedTable } from '../../src/index'

describe('Query All', () => {
	const posts = define('posts', {
		hash: 'userId',
		sort: 'id',
		schema: object({
			userId: number(),
			id: number(),
		}),
	})

	mockDynamoDB({
		tables: [posts],
		seed: [
			seedTable(posts, [
				{ userId: 1, id: 1 },
				{ userId: 1, id: 2 },
				{ userId: 1, id: 3 },
				{ userId: 1, id: 4 },
				{ userId: 1, id: 5 },
				{ userId: 1, id: 6 },
				{ userId: 1, id: 7 },
				{ userId: 1, id: 8 },
				{ userId: 1, id: 9 },
				{ userId: 1, id: 10 },
			]),
		],
	})

	it('should list all items in the table', async () => {
		let items: any[] = []

		const generator = queryAll(posts, {
			batch: 3,
			keyCondition: exp => exp.where('userId').eq(1),
		})

		for await (const batch of generator) {
			expect(batch.length).toBeLessThanOrEqual(3)

			items = [...items, ...batch]
		}

		expect(items).toStrictEqual([
			{ userId: 1, id: 1 },
			{ userId: 1, id: 2 },
			{ userId: 1, id: 3 },
			{ userId: 1, id: 4 },
			{ userId: 1, id: 5 },
			{ userId: 1, id: 6 },
			{ userId: 1, id: 7 },
			{ userId: 1, id: 8 },
			{ userId: 1, id: 9 },
			{ userId: 1, id: 10 },
		])
	})
})
