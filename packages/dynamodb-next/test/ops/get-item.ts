import { getItem, mockDynamoDB, putItem } from '../../src/index'
import { users } from '../aws/tables'

describe('GetItem', () => {
	mockDynamoDB({ tables: [users] })

	const user = { id: 1, name: 'Jack' }

	it('should return undefined for unknown item', async () => {
		const result = await getItem(users, { id: 1 })
		expect(result).toBeUndefined()
	})

	it('should get item', async () => {
		await putItem(users, user)

		const result = await getItem(users, { id: 1 })

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

	it('should get item with projection', async () => {
		const result = await getItem(
			users,
			{ id: 1 },
			{
				select: ['name'],
			}
		)

		expect(result).toStrictEqual({ name: 'Jack' })
		// expectTypeOf(result).toEqualTypeOf<{ id: number; name: string; deletedAt?: Date } | undefined>()
		expectTypeOf(result).toEqualTypeOf<{ name: string } | undefined>()
	})
})
