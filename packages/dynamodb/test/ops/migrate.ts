
import { define, migrate, mockDynamoDB, number, object, scan, string } from '../../src/index'

describe('Migrate', () => {

	const posts1 = define('posts', {
		hash: 'id',
		schema: object({
			id:	number(),
		})
	})

	const posts2 = define('posts', {
		hash: 'id',
		schema: object({
			id:	number(),
			extra: string(),
		})
	})

	mockDynamoDB({
		tables: [ posts1 ],
		seed: {
			posts: [
				{ id: 1 },
				{ id: 2 },
				{ id: 3 },
			]
		}
	})

	it('should migrate the table', async () => {
		const result = await migrate(posts1, posts2, {
			batch: 1,
			transform(item) {
				return {
					...item,
					extra: 'data'
				}
			}
		})

		expect(result).toStrictEqual({
			itemsProcessed: 3
		})

		const list = await scan(posts2)

		expect(list).toStrictEqual({
			cursor: undefined,
			count: 3,
			items: [
				{ id: 2, extra: 'data' },
				{ id: 1, extra: 'data' },
				{ id: 3, extra: 'data' },
			]
		})
	})
})
