import { define, mockDynamoDB, number, object, scanAll, seedTable } from '../../src/index'

describe('Scan All', () => {
	const posts = define('posts', {
		hash: 'id',
		schema: object({
			id: number(),
		}),
	})

	mockDynamoDB({
		tables: [posts],
		seed: [
			seedTable(posts, [
				{ id: 1 },
				{ id: 2 },
				{ id: 3 },
				{ id: 4 },
				{ id: 5 },
				{ id: 6 },
				{ id: 7 },
				{ id: 8 },
				{ id: 9 },
				{ id: 10 },
			]),
		],
	})

	it('should list all items in the table', async () => {
		let items: any[] = []

		const generator = scanAll(posts, {
			batch: 3,
		})

		for await (const batch of generator) {
			expect(batch.length).toBeLessThanOrEqual(3)

			items = [...items, ...batch]
		}

		expect(items.length).toStrictEqual(10)
	})

	it('should list all items in the table', async () => {
		let items: any[] = []

		const generator = scanAll(posts, {
			batch: 3,
		})

		for await (const batch of generator) {
			expect(batch.length).toBeLessThanOrEqual(3)

			items = [...items, ...batch]
		}

		expect(items.length).toStrictEqual(10)
	})
})
