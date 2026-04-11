import { deleteItem, getItem, mockDynamoDB, putItem } from '../../src/index'
import { users } from '../aws/tables'

describe('Delete', () => {
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

		expectTypeOf(result).toEqualTypeOf<{ id: number; name: string } | undefined>()
		expect(result).toStrictEqual(user)
	})

	it('should delete with condition', async () => {
		await putItem(users, user)

		await deleteItem(
			users,
			{ id: 1 },
			{
				condition: exp => exp.where('id').eq(1),
			}
		)

		const result = await getItem(users, { id: 1 })
		expect(result).toBeUndefined()
	})
})
