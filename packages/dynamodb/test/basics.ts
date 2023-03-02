import { getItem, putItem, query, updateItem, pagination, deleteItem, scan, batchGetItem, mockDynamoDB, optional, string, number, object, define } from '../src/index'
import { tables } from './aws/tables'

describe('DynamoDB Basic OPS', () => {
	mockDynamoDB({ tables })

	const posts = define('posts', {
		hash: 'userId',
		sort: 'id',
		schema: object({
			id:	number(),
			userId: number(),
			title: string(),
			content: optional(string())
		})
	})

	const users = define('users', {
		hash: 'id',
		schema: object({
			id:	number(),
			name: string(),
		})
	})

	describe('putItem', () => {
		it('should put item', async () => {
			await putItem(users, {
				id: 1,
				name: 'John',
			})

			await putItem(posts, {
				userId: 1,
				id: 1,
				title: 'First',
				content: 'Welcome',
			})

			await putItem(posts, {
				userId: 1,
				id: 2,
				title: 'Second',
			})
		})

		it('should put item with valid condition', async () => {
			await putItem(
				posts,
				{
					userId: 1,
					id: 3,
					title: 'Third',
				},
				{
					condition(exp) { exp.where('id').attributeNotExists }
				}
			)
		})

		it('should not put item with invalid condition', async () => {
			const promise = putItem(
				posts,
				{
					userId: 1,
					id: 3,
					title: 'Third Again',
				},
				{
					condition(exp) { exp.where('id').attributeNotExists }
				}
			)

			await expect(promise).rejects.toThrow(Error)
		})
	})

	describe('getItem', () => {
		it('should get item', async () => {
			const user = await getItem(users, { id: 1 })
			expect(user).toStrictEqual({
				id: 1,
				name: 'John',
			})

			const result = await getItem(posts, { userId: 1, id: 1 })
			expect(result).toStrictEqual({
				userId: 1,
				id: 1,
				title: 'First',
				content: 'Welcome',
			})
		})

		it('should not get unknown item', async () => {
			const result = await getItem(posts, { userId: 1, id: 99 })
			expect(result).toBeUndefined()
		})
	})

	describe('updateItem', () => {
		it('should update item', async () => {
			await updateItem(
				users,
				{ id: 1 },
				{
					update(exp) { exp.set('name').value('Jessy') }
				}
			)

			const content = 'updated 1'
			const result = await updateItem(
				posts,
				{ userId: 1, id: 1 },
				{
					update(exp) { exp.set('content').value(content) }
				}
			)
			expect(result).toBeUndefined()

			const result2 = await getItem(posts, { userId: 1, id: 1 })
			expect(result2).toStrictEqual({
				userId: 1,
				id: 1,
				title: 'First',
				content,
			})
		})

		it('should return updated item', async () => {
			const content = 'updated 2'
			const result = await updateItem(
				posts,
				{ userId: 1, id: 1 },
				{
					update(exp) { exp.set('content').value(content) },
					return: 'ALL_NEW',
				}
			)

			expect(result).toStrictEqual({
				userId: 1,
				id: 1,
				title: 'First',
				content,
			})
		})

		it('should update with condition', async () => {
			const title = 'First'
			const content = 'updated 3'
			const result = await updateItem(
				posts,
				{ userId: 1, id: 1 },
				{
					update(exp) { exp.set('content').value(content) },
					condition(exp) { exp.where('title').eq(title) },
					return: 'ALL_NEW',
				}
			)

			expect(result).toStrictEqual({
				userId: 1,
				id: 1,
				title: 'First',
				content,
			})
		})
	})

	describe('deleteItem', () => {
		it('should delete item', async () => {
			await putItem(users, {
				id: 2,
				name: 'Temp',
			})

			await deleteItem(users, { id: 2 })

			await putItem(posts, {
				userId: 2,
				id: 1,
				title: 'Temp',
			})

			const result = await deleteItem(posts, { userId: 2, id: 1 })
			expect(result).toBeUndefined()

			const result2 = await getItem(posts, { userId: 2, id: 1 })
			expect(result2).toBeUndefined()
		})

		it('should return deleted item', async () => {
			await putItem(posts, {
				userId: 2,
				id: 1,
				title: 'Temp',
			})

			const result = await deleteItem(
				posts,
				{ userId: 2, id: 1 },
				{ return: 'ALL_OLD' }
			)

			expect(result).toStrictEqual({
				userId: 2,
				id: 1,
				title: 'Temp',
			})
		})

		it('should delete with condition', async () => {
			await putItem(posts, {
				userId: 2,
				id: 1,
				title: 'Temp',
			})

			await deleteItem(
				posts,
				{ userId: 2, id: 1 },
				{
					condition(exp) {
						exp.where('id').eq(1)
					},
				}
			)

			const result = await getItem(posts, { userId: 2, id: 1 })
			expect(result).toBeUndefined()
		})
	})

	describe('query', () => {
		it('should query list', async () => {
			const result1 = await query(users, {
				keyCondition(exp) { exp.where('id').eq(1) }
			})

			expect(result1).toStrictEqual({
				cursor: undefined,
				count: 1,
				items: [
					{
						id: 1,
						name: 'Jessy',
					},
				],
			})

			const result2 = await query(posts, {
				keyCondition(exp) { exp.where('userId').eq(1) }
			})

			expect(result2).toStrictEqual({
				cursor: undefined,
				count: 3,
				items: [
					{
						userId: 1,
						id: 1,
						title: 'First',
						content: 'updated 3',
					},
					{
						userId: 1,
						id: 2,
						title: 'Second',
					},
					{
						userId: 1,
						id: 3,
						title: 'Third',
					},
				],
			})
		})

		it('should return correct cursor for backwards list', async () => {
			const result1 = await query(posts, {
				keyCondition(exp) { exp.where('userId').eq(1) },
				forward: false,
				limit: 1,
			})

			expect(result1).toStrictEqual({
				cursor: {
					userId: 1,
					id: 3,
				},
				count: 1,
				items: [
					{
						userId: 1,
						id: 3,
						title: 'Third',
					},
				],
			})

			const result2 = await query(posts, {
				keyCondition(exp) { exp.where('userId').eq(1) },
				forward: false,
				limit: 1,
				cursor: result1.cursor,
			})

			expect(result2).toStrictEqual({
				cursor: {
					userId: 1,
					id: 2,
				},
				count: 1,
				items: [
					{
						userId: 1,
						id: 2,
						title: 'Second',
					},
				],
			})
		})

		it('should support limit & cursor', async () => {
			const result1 = await query(posts, {
				keyCondition(exp) { exp.where('userId').eq(1) },
				limit: 1,
			})

			expect(result1).toStrictEqual({
				count: 1,
				cursor: expect.any(Object) as object,
				items: [
					{
						userId: 1,
						id: 1,
						title: 'First',
						content: 'updated 3',
					},
				],
			})

			const result2 = await query(posts, {
				keyCondition(exp) { exp.where('userId').eq(1) },
				limit: 1,
				cursor: result1.cursor,
			})

			expect(result2).toStrictEqual({
				count: 1,
				cursor: expect.any(Object) as object,
				items: [
					{
						userId: 1,
						id: 2,
						title: 'Second',
					},
				],
			})
		})
	})

	describe('pagination', () => {
		it('should pagination list', async () => {
			const result1 = await pagination(users, {
				keyCondition(exp) { exp.where('id').eq(1) }
			})

			expect(result1).toStrictEqual({
				cursor: undefined,
				count: 1,
				items: [
					{
						id: 1,
						name: 'Jessy',
					},
				],
			})

			const result2 = await pagination(posts, {
				keyCondition(exp) { exp.where('userId').eq(1) },
			})

			expect(result2).toStrictEqual({
				cursor: undefined,
				count: 3,
				items: [
					{
						userId: 1,
						id: 1,
						title: 'First',
						content: 'updated 3',
					},
					{
						userId: 1,
						id: 2,
						title: 'Second',
					},
					{
						userId: 1,
						id: 3,
						title: 'Third',
					},
				],
			})
		})

		it('should support limit & cursor', async () => {
			const result1 = await pagination(posts, {
				keyCondition(exp) { exp.where('userId').eq(1) },
				limit: 1,
			})

			expect(result1).toStrictEqual({
				count: 1,
				cursor: expect.any(String) as string,
				items: [
					{
						userId: 1,
						id: 1,
						title: 'First',
						content: 'updated 3',
					},
				],
			})

			const result2 = await pagination(posts, {
				keyCondition(exp) { exp.where('userId').eq(1) },
				limit: 1,
				cursor: result1.cursor,
			})

			expect(result2).toStrictEqual({
				count: 1,
				cursor: expect.any(String) as string,
				items: [
					{
						userId: 1,
						id: 2,
						title: 'Second',
					},
				],
			})
		})

		it('should not return cursor when no more items are available', async () => {
			const result = await pagination(posts, {
				keyCondition(exp) { exp.where('userId').eq(1) },
				limit: 3,
			})

			expect(result.items.length).toBe(3)
			expect(result.cursor).toBeUndefined()
		})
	})

	describe('scan', () => {
		it('should scan list', async () => {
			const result1 = await scan(users)

			expect(result1).toStrictEqual({
				cursor: undefined,
				count: 1,
				items: [
					{
						id: 1,
						name: 'Jessy',
					},
				],
			})

			const result2 = await scan(posts)

			expect(result2).toStrictEqual({
				cursor: undefined,
				count: 3,
				items: [
					{
						userId: 1,
						id: 1,
						title: 'First',
						content: 'updated 3',
					},
					{
						userId: 1,
						id: 2,
						title: 'Second',
					},
					{
						userId: 1,
						id: 3,
						title: 'Third',
					},
				],
			})
		})

		it('should support limit & cursor', async () => {
			const result1 = await scan(posts, {
				limit: 1,
			})

			expect(result1).toStrictEqual({
				count: 1,
				cursor: expect.any(Object) as object,
				items: [
					{
						userId: 1,
						id: 1,
						title: 'First',
						content: 'updated 3',
					},
				],
			})

			const result2 = await scan(posts, {
				limit: 1,
				cursor: result1.cursor,
			})

			expect(result2).toStrictEqual({
				count: 1,
				cursor: expect.any(Object) as object,
				items: [
					{
						userId: 1,
						id: 2,
						title: 'Second',
					},
				],
			})
		})
	})

	describe('batchGetItem', () => {
		it('should batch get items', async () => {
			const result1 = await batchGetItem(users, [{ id: 1 }])

			expect(result1).toStrictEqual([
				{
					id: 1,
					name: 'Jessy',
				},
			])

			const result2 = await batchGetItem(posts, [
				{ userId: 1, id: 1 },
				{ userId: 1, id: 2 },
				{ userId: 1, id: 3 },
				{ userId: 1, id: 1000 },
			])

			expect(result2).toStrictEqual([
				{
					userId: 1,
					id: 1,
					title: 'First',
					content: 'updated 3',
				},
				{
					userId: 1,
					id: 2,
					title: 'Second',
				},
				{
					userId: 1,
					id: 3,
					title: 'Third',
				},
				undefined,
			])
		})

		it('should filter non existent items', async () => {
			const result = await batchGetItem(
				posts,
				[
					{ userId: 1, id: 1 },
					{ userId: 1, id: 2 },
					{ userId: 1, id: 3 },
					{ userId: 1, id: 1000 },
				],
				{
					filterNonExistentItems: true,
				}
			)

			expect(result).toStrictEqual([
				{
					userId: 1,
					id: 1,
					title: 'First',
					content: 'updated 3',
				},
				{
					userId: 1,
					id: 2,
					title: 'Second',
				},
				{
					userId: 1,
					id: 3,
					title: 'Third',
				},
			])
		})

		it('should batch get with big data', async () => {
			const content = Array.from({ length: 100000 })
				.map(() => 'xxx')
				.join(' ')

			const limit = 100
			const ids = Array.from({ length: limit }).map((_, id) => id + 1)

			await Promise.all(
				ids.map(id => {
					return putItem(posts, {
						userId: 1,
						title: 'Title',
						id,
						content,
					})
				})
			)

			const result = await batchGetItem(
				posts,
				ids.map(id => ({
					userId: 1,
					id,
				}))
			)

			expect(result.length).toBe(limit)
		})
	})
})
