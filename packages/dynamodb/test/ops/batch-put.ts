import { batchPutItem, batchGetItem, mockDynamoDB } from '../../src/index'
import { users } from '../aws/tables'

describe('Batch Put', () => {

	mockDynamoDB({ tables: [ users ] })

	it('should batch put items', async () => {
		await batchPutItem(users, [
			{ id: 1, name: '' },
			{ id: 2, name: '' },
			{ id: 3, name: '' },
		])

		const result = await batchGetItem(users, [
			{ id: 1 },
			{ id: 2 },
			{ id: 3 },
		])

		expect(result).toStrictEqual([
			{ id: 1, name: '' },
			{ id: 2, name: '' },
			{ id: 3, name: '' },
		])
	})

	it('should batch put with big data', async () => {
		const name = Array
			.from({ length: 100000 })
			.map(() => 'xxx')
			.join(' ')

		const limit = 100
		const ids = Array
			.from({ length: limit })
			.map((_, id) => id + 1)

		await batchPutItem(
			users,
			ids.map(id => ({ id, name }))
		)

		const result = await batchGetItem(
			users,
			ids.map(id => ({ id }))
		)

		expect(result.length).toBe(limit)
	})
})
