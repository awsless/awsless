
import { define, migrate, mockDynamoDB, number, object, scan, string } from '../src/index'
import { tables } from './aws/tables'

describe('Migrate', () => {

	mockDynamoDB({
		tables,
		seed: {
			posts: [
				{ userId: 1, id: 1, title: 'one' },
				{ userId: 1, id: 2, title: 'two' },
				{ userId: 1, id: 3, title: 'three' },
			]
		}
	})

	const posts1 = define('posts', {
		hash: 'userId',
		sort: 'id',
		schema: object({
			id:	number(),
			userId: number(),
			title: string(),
		})
	})

	const posts2 = define('posts', {
		hash: 'userId',
		sort: 'id',
		schema: object({
			id:	number(),
			userId: number(),
			title: string(),
			date: string(),
		})
	})

	it('should migrate the table', async () => {

		const result = await migrate(posts1, posts2, {
			batch: 1,
			transform(item) {
				return {
					...item,
					date: (new Date).toISOString()
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
				{
					id: 1,
					userId: 1,
					title: 'one',
					date: expect.any(String) as string
				},
				{
					id: 2,
					userId: 1,
					title: 'two',
					date: expect.any(String) as string
				},
				{
					id: 3,
					userId: 1,
					title: 'three',
					date: expect.any(String) as string
				}
			]
		})
	})
})
