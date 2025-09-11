import {
	conditionCheck,
	define,
	deleteItem,
	mockDynamoDB,
	number,
	object,
	optional,
	putItem,
	scan,
	string,
	TransactionCanceledException,
	transactWrite,
	updateItem,
} from '../../src/index'

describe('Transact Write', () => {
	const users = define('users', {
		hash: 'id',
		schema: object({
			id: number(),
			name: optional(string()),
		}),
	})

	mockDynamoDB({ tables: [users] })

	it('should put', async () => {
		await transactWrite([
			//
			putItem(users, { id: 1 }),
			putItem(users, { id: 2 }),
			putItem(users, { id: 3 }),
		])

		const result = await scan(users)
		expect(result).toStrictEqual({
			cursor: undefined,
			items: [{ id: 2 }, { id: 1 }, { id: 3 }],
		})
	})

	it('should update', async () => {
		await transactWrite([
			updateItem(users, { id: 1 }, { update: e => e.name.set('Test') }),
			updateItem(users, { id: 2 }, { update: e => e.name.set('Test') }),
			updateItem(users, { id: 3 }, { update: e => e.name.set('Test') }),
		])

		const result = await scan(users)
		expect(result).toStrictEqual({
			cursor: undefined,
			items: [
				{ id: 2, name: 'Test' },
				{ id: 1, name: 'Test' },
				{ id: 3, name: 'Test' },
			],
		})
	})

	it('should delete', async () => {
		await transactWrite([
			//
			deleteItem(users, { id: 1 }),
			deleteItem(users, { id: 2 }),
			deleteItem(users, { id: 3 }),
		])

		const result = await scan(users)
		expect(result).toStrictEqual({
			cursor: undefined,
			items: [],
		})
	})

	it('should condition check', async () => {
		await transactWrite([
			putItem(users, { id: 1 }),
			conditionCheck(
				users,
				{ id: 0 },
				{
					when: e => e.id.notExists(),
				}
			),
		])

		const result = await scan(users)
		expect(result).toStrictEqual({
			cursor: undefined,
			items: [{ id: 1 }],
		})
	})

	it('should throw on condition error', async () => {
		const promise = transactWrite([
			putItem(users, { id: 2 }),
			conditionCheck(
				users,
				{ id: 1 },
				{
					when: e => e.id.notExists(),
				}
			),
		])

		await expect(promise).rejects.toThrow(TransactionCanceledException)

		try {
			await promise
		} catch (error) {
			if (error instanceof TransactionCanceledException) {
				expect(error.conditionFailedAt(0)).toBe(false)
				expect(error.conditionFailedAt(1)).toBe(true)
				expect(error.conditionFailedAt(2)).toBe(false)
			} else {
				throw error
			}
		}

		const result = await scan(users)
		expect(result).toStrictEqual({
			cursor: undefined,
			items: [{ id: 1 }],
		})
	})

	// it('should throw on conflict error', async () => {
	// 	const promise = Promise.all(
	// 		Array.from({ length: 1000 }).map(async () => {
	// 			await transactWrite([
	// 				//
	// 				updateItem(
	// 					users,
	// 					{ id: 1 },
	// 					{
	// 						update: e => e.name.set('Conflict'),
	// 						when: e => e.id.exists(),
	// 					}
	// 				),
	// 				conditionCheck(
	// 					users,
	// 					{ id: 2 },
	// 					{
	// 						when: e => e.id.notExists(),
	// 					}
	// 				),
	// 			])
	// 		})
	// 	)

	// 	await expect(promise).rejects.toThrow(TransactionCanceledException)

	// 	try {
	// 		await promise
	// 	} catch (error) {
	// 		console.log(error)

	// 		if (error instanceof TransactionCanceledException) {
	// 			expect(error.conflictAt(0)).toBe(true)
	// 			expect(error.conflictAt(1)).toBe(false)
	// 		} else {
	// 			throw error
	// 		}
	// 	}
	// })
})
