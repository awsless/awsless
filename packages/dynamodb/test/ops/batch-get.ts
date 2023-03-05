import { putItem, batchGetItem, mockDynamoDB } from '../../src/index'
import { users } from '../aws/tables'

describe('Batch Get', () => {

	mockDynamoDB({ tables: [ users ] })

	it('should batch get items', async () => {

		await putItem(users, { id: 1, name: '' })
		await putItem(users, { id: 2, name: '' })
		await putItem(users, { id: 3, name: '' })

		const result = await batchGetItem(users, [
			{ id: 1 },
			{ id: 2 },
			{ id: 3 },
			{ id: 1000 },
		])

		expect(result).toStrictEqual([
			{ id: 1, name: '' },
			{ id: 2, name: '' },
			{ id: 3, name: '' },
			undefined,
		])
	})

	it('should filter non existent items', async () => {
		const result = await batchGetItem(users, [
			{ id: 1 },
			{ id: 2 },
			{ id: 3 },
			{ id: 1000 },
		], {
			filterNonExistentItems: true,
		})

		expect(result).toStrictEqual([
			{ id: 1, name: '' },
			{ id: 2, name: '' },
			{ id: 3, name: '' },
		])
	})

	it('should batch get with big data', async () => {
		const name = Array
			.from({ length: 100000 })
			.map(() => 'xxx')
			.join(' ')

		const limit = 100
		const ids = Array
			.from({ length: limit })
			.map((_, id) => id + 1)

		await Promise.all(
			ids.map(id => {
				return putItem(users, {
					id,
					name,
				})
			})
		)

		const result = await batchGetItem(
			users,
			ids.map(id => ({ id }))
		)

		expect(result.length).toBe(limit)
	})
})
