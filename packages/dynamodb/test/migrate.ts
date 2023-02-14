
import { mockDynamoDB } from '@awsless/test'
import { migrate, scan, Table } from '../src/index'

describe('Migrate', () => {
	mockDynamoDB({
		path: './test/aws/dynamodb.yml',
		seed: {
			posts: [
				{ userId: 1, id: 1, title: 'one' },
				{ userId: 1, id: 2, title: 'two' },
				{ userId: 1, id: 3, title: 'three' },
			]
		}
	})


	type PostV1 = {
		userId: number
		id: number
		title: string
	}

	type PostV2 = PostV1 & {
		createdAt: string
	}

	const posts1 = new Table<PostV1, 'userId' | 'id'>('posts')
	const posts2 = new Table<PostV2, 'userId' | 'id'>('posts')

	it('should migrate the table', async () => {

		const result = await migrate(posts1, posts2, {
			batch: 1,
			transform(item) {
				return {
					...item,
					createdAt: (new Date).toISOString()
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
					userId: 1,
					id: 1,
					title: 'one',
					createdAt: expect.any(String) as string
				},
				{
					userId: 1,
					id: 2,
					title: 'two',
					createdAt: expect.any(String) as string
				},
				{
					userId: 1,
					id: 3,
					title: 'three',
					createdAt: expect.any(String) as string
				}
			]
		})
	})
})
