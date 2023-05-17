import { bigint, define, mockDynamoDB, number, object, paginateQuery, putItem } from '../src/index'

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

	const other = define('other', {
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

	mockDynamoDB({ tables: [posts, other] })

	it('should pagination list', async () => {
		await putItem(posts, { userId: 1, id: 1n, sortId: 1 })

		const result = await paginateQuery(posts, {
			keyCondition: exp => exp.where('userId').eq(1),
			limit: 1,
		})

		expect(result).toStrictEqual({
			cursor: undefined,
			count: 1,
			items: [{ userId: 1, sortId: 1, id: 1n }],
		})
	})
})
