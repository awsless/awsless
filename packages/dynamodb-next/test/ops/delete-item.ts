import { ConditionalCheckFailedException, deleteItem, getItem, mockDynamoDB, putItem } from '../../src/index'
import { users } from '../aws/tables'

describe('deleteItem', () => {
	mockDynamoDB({ tables: [users] })

	const user = { id: 1, name: 'Jack' }

	it('should delete', async () => {
		await putItem(users, user)

		const result1 = await getItem(users, { id: 1 })
		expect(result1).toStrictEqual(user)

		const result2 = await deleteItem(users, { id: 1 })
		expectTypeOf(result2).toBeVoid()

		const result3 = await getItem(users, { id: 1 })
		expect(result3).toBeUndefined()
	})

	it('should return deleted item', async () => {
		await putItem(users, user)

		const result = await deleteItem(users, { id: 1 }, { return: 'ALL_OLD' })

		expect(result).toStrictEqual(user)
		expectTypeOf(result).toEqualTypeOf<
			| {
					id: number
					name: string
					deletedAt?: Date
			  }
			| undefined
		>()
	})

	it('should delete with condition', async () => {
		await putItem(users, user)

		await deleteItem(
			users,
			{ id: 1 },
			{
				when: e => e.id.eq(1),
			}
		)

		const result = await getItem(users, { id: 1 })
		expect(result).toBeUndefined()
	})

	it('should throw on delete with failing condition', async () => {
		await expect(
			deleteItem(
				users,
				{ id: 1 },
				{
					when: e => e.id.eq(1),
				}
			)
		).rejects.toThrow(ConditionalCheckFailedException)
	})
})
