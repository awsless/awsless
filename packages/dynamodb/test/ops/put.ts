import { ConditionalCheckFailedException, getItem, mockDynamoDB, putItem } from '../../src/index'
import { users } from '../aws/tables'

describe('Put', () => {
	mockDynamoDB({ tables: [users] })

	const user = { id: 1, name: 'Jack' }

	it('should put', async () => {
		const result1 = await putItem(users, user)
		expectTypeOf(result1).toBeVoid()

		const result2 = await getItem(users, { id: 1 })
		expect(result2).toStrictEqual(user)
	})

	it('should return updated item', async () => {
		const result = await putItem(users, user, { return: 'ALL_OLD' })

		expectTypeOf(result).toEqualTypeOf<{ id: number; name: string } | undefined>()
		expect(result).toStrictEqual(user)
	})

	it('should put when condition is successful', async () => {
		const other = { ...user, id: 2 }
		await putItem(users, other, {
			condition: exp => exp.where('id').not.exists,
		})

		const result = await getItem(users, { id: 2 })
		expect(result).toStrictEqual(other)
	})

	it('should not put when condition fails', async () => {
		await expect(
			putItem(users, user, {
				condition: exp => exp.where('id').not.exists,
			})
		).rejects.toThrow(ConditionalCheckFailedException)
	})
})
