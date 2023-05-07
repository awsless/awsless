
import { scan, transactWrite, transactPut, transactConditionCheck, define, mockDynamoDB, object, number, TransactionCanceledException, transactUpdate, optional, string, transactDelete } from '../../src/index'

describe('DynamoDB Transact', () => {

	const users = define('users', {
		hash: 'id',
		schema: object({
			id: number(),
			name: optional(string()),
		}),
	})

	mockDynamoDB({ tables: [ users ] })

	it('should put', async () => {
		await transactWrite({
			items: [
				transactPut(users, { id: 1 }),
				transactPut(users, { id: 2 }),
				transactPut(users, { id: 3 }),
			]
		})

		const result = await scan(users)
		expect(result).toStrictEqual({
			cursor: undefined,
			count: 3,
			items: [
				{ id: 2 },
				{ id: 1 },
				{ id: 3 },
			]}
		)
	})

	it('should update', async () => {
		await transactWrite({
			items: [
				transactUpdate(users, { id: 1 }, { update: (exp) => exp.update('name').set('Test') }),
				transactUpdate(users, { id: 2 }, { update: (exp) => exp.update('name').set('Test') }),
				transactUpdate(users, { id: 3 }, { update: (exp) => exp.update('name').set('Test') }),
			]
		})

		const result = await scan(users)
		expect(result).toStrictEqual({
			cursor: undefined,
			count: 3,
			items: [
				{ id: 2, name: 'Test' },
				{ id: 1, name: 'Test' },
				{ id: 3, name: 'Test' },
			]}
		)
	})

	it('should delete', async () => {
		await transactWrite({
			items: [
				transactDelete(users, { id: 1 }),
				transactDelete(users, { id: 2 }),
				transactDelete(users, { id: 3 }),
			]
		})

		const result = await scan(users)
		expect(result).toStrictEqual({
			cursor: undefined,
			count: 0,
			items: []
		})
	})

	it('should condition check', async () => {
		await transactWrite({
			items: [
				transactConditionCheck(users, { id: 0 }, {
					condition: (exp) => exp.where('id').not.exists
				}),

				transactPut(users, { id: 1 }),
			]
		})

		const result = await scan(users)
		expect(result).toStrictEqual({
			cursor: undefined,
			count: 1,
			items: [ { id: 1 } ]
		})
	})

	it('should throw on condition error', async () => {
		const promise = transactWrite({
			items: [
				transactConditionCheck(users, { id: 1 }, {
					condition: (exp) => exp.where('id').not.exists
				}),
				transactPut(users, { id: 2 }),
			]
		})

		await expect(promise).rejects.toThrow(TransactionCanceledException)

		try {
			await promise
		} catch(error) {
			if(error instanceof TransactionCanceledException) {
				expect(error.conditionFailedAt(0)).toBe(true)
				expect(error.conditionFailedAt(1)).toBe(false)
				expect(error.conditionFailedAt(0, 1)).toBe(true)
				expect(error.conditionFailedAt(1, 2)).toBe(false)
				expect(error.conditionFailedAt(0, 1, 2)).toBe(true)
				expect(error.conditionFailedAt(2, 3, 4)).toBe(false)
			}
		}

		const result = await scan(users)
		expect(result).toStrictEqual({
			cursor: undefined,
			count: 1,
			items: [ { id: 1 } ]
		})
	})
})
