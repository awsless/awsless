
import { bigint, define, deleteItem, getItem, mockDynamoDB, number, object, optional, putItem, query, scan, string, stringSet, updateItem } from '../src/index'
import { batchGetItem } from '../src/operations/batch-get-item'
import { tables } from './aws/tables'

describe('Test', () => {

	mockDynamoDB({ tables })

	const posts = define('posts', {
		hash: 'userId',
		sort: 'id',
		schema: object({
			id: number(),
			sortId: number(),
			userId: number(),
			title: optional(string()),
			likes: bigint(),
			tags: stringSet(),
		}),
		indexes: {
			list: { hash: 'userId', sort: 'sortId' },
		}
	})

	const tags = new Set<string>(['tag'])

	it('should put', async () => {
		await putItem(posts, {
			id: 1,
			userId: 1,
			sortId: 1,
			title: 'Post',
			likes: 0n,
			tags,
		}, {
			condition(exp) {
				exp
				.where('id').not.attributeExists
				.and
				.where('userId').attributeNotExists
				.and
				.where('id').nq(1)
				.and
				.where('id').not.eq(1)
				.and
				.where('tags').not.contains('tag')
			}
		})
	})

	it('should get', async () => {
		const result = await getItem(posts, { userId: 1, id: 1 }, {
			projection: [ 'title' ]
		})

		// console.log(result?.id.toString())

		expect(result).toStrictEqual({
			title: 'Post',
		})
	})

	it('should update', async () => {
		const result = await updateItem(posts, { userId: 1, id: 1 }, {
			return: 'UPDATED_NEW',
			update(exp) {
				exp
				.set('title').value('Edited')
				.add('likes').value(1n)
			},
			condition(exp) {
				exp
				.where('likes').eq(0n)
				.and
				.where('id').between(1, 2)
			}
		})

		expect(result).toStrictEqual({
			title: 'Edited',
			likes: 1n
		})
	})

	it('should delete', async () => {
		const result = await deleteItem(posts, { userId: 1, id: 1 }, {
			return: 'ALL_OLD'
		})

		expect(result).toStrictEqual({
			id: 1,
			userId: 1,
			sortId: 1,
			title: 'Edited',
			likes: 1n,
			tags,
		})
	})

	it('should scan', async () => {
		await putItem(posts, { id: 1, userId: 1, sortId: 1, title: 'Post', likes: 0n, tags })
		await putItem(posts, { id: 2, userId: 1, sortId: 2, title: 'Post', likes: 0n, tags })
		await putItem(posts, { id: 3, userId: 1, sortId: 3, title: 'Post', likes: 0n, tags })

		const result = await scan(posts, {
			index: 'list',
			limit: 1
		})

		expect(result).toStrictEqual({
			cursor: {
				id: 1,
				sortId: 1,
				userId: 1,
			},
			count: 1,
			items: [{
				id: 1,
				userId: 1,
				sortId: 1,
				title: 'Post',
				likes: 0n,
				tags,
			}]
		})
	})

	it('should query', async () => {
		const result = await query(posts, {
			keyCondition(exp) { exp.where('userId').eq(1) },
			projection: [ 'userId', 'id' ],
			limit: 2,
		})

		expect(result).toStrictEqual({
			cursor: { id: 2, userId: 1 },
			count: 2,
			items: [
				{ id: 1, userId: 1, },
				{ id: 2, userId: 1, },
			]
		})
	})

	it('should batchGetItem', async () => {
		const result = await batchGetItem(posts, [
			{ id: 1, userId: 1 },
			{ id: 2, userId: 1 },
			{ id: 3, userId: 1 },
		], { projection: [ 'id', 'userId' ] })

		expect(result).toStrictEqual([
			{ id: 1, userId: 1 },
			{ id: 2, userId: 1 },
			{ id: 3, userId: 1 },
		])
	})
})
