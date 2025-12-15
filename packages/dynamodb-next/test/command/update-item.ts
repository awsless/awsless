import {
	ConditionalCheckFailedException,
	date,
	define,
	getItem,
	mockDynamoDB,
	number,
	object,
	optional,
	string,
	updateItem,
} from '../../src/index'

describe('Update', () => {
	const users = define('users', {
		hash: 'id',
		schema: object({
			id: number(),
			name: string(),
			email: string(),
			deletedAt: optional(date()),
		}),
	})

	mockDynamoDB({ tables: [users] })

	const user = { id: 1, name: 'Jack' }

	it('should update', async () => {
		const result1 = await updateItem(
			users,
			{ id: 1 },
			{
				update: e => e.name.set('Jack'),
			}
		)

		expectTypeOf(result1).toBeVoid()
		expect(result1).toBeUndefined()

		const result2 = await getItem(users, { id: 1 })
		expect(result2).toStrictEqual(user)
	})

	it('should update with set partial', async () => {
		await updateItem(
			users,
			{ id: 1 },
			{
				update: e =>
					e.setPartial({
						name: 'Edited 1',
					}),
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
				update: e => e.name.set('Edited 2'),
				return: 'ALL_NEW',
			}
		)

		expect(result).toStrictEqual({
			id: 1,
			name: 'Edited 2',
		})

		expectTypeOf(result).toEqualTypeOf<{
			id: number
			name: string
			email: string
			deletedAt?: Date
		}>()
	})

	it('should update with condition', async () => {
		const result = await updateItem(
			users,
			{ id: 1 },
			{
				update: e => e.name.set('Jack'),
				when: e => e.size(e.name).gt(1),
				return: 'ALL_NEW',
			}
		)

		expect(result).toStrictEqual(user)
	})

	it('should delete field', async () => {
		await updateItem(
			users,
			{ id: 1 },
			{
				update: e => e.deletedAt.delete(),
			}
		)
	})

	it('should set allow path values', async () => {
		await updateItem(
			users,
			{ id: 1 },
			{
				update: e => e.name.set(e.name),
				when: e => [
					//
					e.name.in(['Jack', e.email]),
					// e.name.contains(e.email),
				],
			}
		)
	})

	it('should fail with condition', async () => {
		await expect(
			updateItem(
				users,
				{ id: 1 },
				{
					update: e => e.name.set('Jack'),
					when: e => e.name.notExists(),
				}
			)
		).rejects.toThrow(ConditionalCheckFailedException)
	})
})
