import { define, getIndexItem, mockDynamoDB, number, object, putItem, string } from '../../src/index'

describe('getIndexItem', () => {
	const users = define('users', {
		hash: 'id',
		schema: object({
			id: number(),
			name: string(),
		}),
		indexes: {
			name: { hash: 'name' },
			deep: { hash: 'id', sort: 'name' },
		},
	})

	mockDynamoDB({ tables: [users] })

	const user = { id: 1, name: 'Jack' }

	it('should return undefined for unknown item', async () => {
		const result = await getIndexItem(users, 'name', { name: 'Jack' })
		expect(result).toBeUndefined()
	})

	it('should get item', async () => {
		await putItem(users, user)
		const result = await getIndexItem(users, 'name', { name: 'Jack' })
		expect(result).toStrictEqual(user)
	})

	// Fails because of Local DynamoDB bug.
	// InternalFailure: The request processing has failed because of an unknown error, exception or failure.

	// it('should get item with a sort key', async () => {
	// 	const result = await getIndexItem(users, 'deep', { id: 1, name: 'Jack' })
	// 	expect(result).toStrictEqual(user)
	// })

	it('should only project given properties', async () => {
		const result = await getIndexItem(
			users,
			'name',
			{ name: 'Jack' },
			{
				select: ['name'],
			}
		)

		expect(result).toStrictEqual({ name: 'Jack' })
		expectTypeOf(result).toEqualTypeOf<{ name: string } | undefined>()
	})
})
