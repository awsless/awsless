import { getItem, mockDynamoDB, updateItem } from '../../src/index'
import { users } from '../aws/tables'

describe('Update', () => {
	mockDynamoDB({ tables: [users] })

	const user = { id: 1, name: 'Jack' }

	it('should update', async () => {
		const result1 = await updateItem(
			users,
			{ id: 1 },
			{
				update: exp => exp.update('name').set('Jack'),
			}
		)

		expectTypeOf(result1).toBeVoid()
		expect(result1).toBeUndefined()

		const result2 = await getItem(users, { id: 1 })
		expect(result2).toStrictEqual(user)
	})

	it('should update with setItem', async () => {
		await updateItem(
			users,
			{ id: 1 },
			{
				update: exp => exp.setItem({ name: 'Edited 1' }),
			}
		)

		const result = await getItem(users, { id: 1 })
		expect(result).toStrictEqual({
			id: 1,
			name: 'Edited 1',
		})
	})

	it('should return updated item', async () => {
		const result = await updateItem(
			users,
			{ id: 1 },
			{
				update: exp => exp.update('name').set('Edited 2'),
				return: 'ALL_NEW',
			}
		)

		expectTypeOf(result).toEqualTypeOf<{ id: number; name: string } | undefined>()
		expect(result).toStrictEqual({
			id: 1,
			name: 'Edited 2',
		})
	})

	it('should update with condition', async () => {
		const result = await updateItem(
			users,
			{ id: 1 },
			{
				update: exp => exp.update('name').set('Jack'),
				condition: exp => exp.where('name').eq('Edited 2'),
				return: 'ALL_NEW',
			}
		)

		expect(result).toStrictEqual(user)
	})
})
