import { define, object, string, mockDynamoDB, number, optional, putItem, query } from '../../src'

describe('Mock Indexes', () => {
	const users = define('users', {
		hash: 'id',
		schema: object({
			id: number(),
			name: optional(string()),
		}),
		indexes: {
			name: {
				hash: 'id',
				sort: 'name',
			},
		},
	})

	mockDynamoDB({
		tables: [users],
	})

	it('should properly mock the index of a optional field', async () => {
		await putItem(users, {
			id: 1,
		})
	})

	it('should not return a result for undefined sort key field', async () => {
		const result = await query(
			users,
			{ id: 1 },
			{
				index: 'name',
			}
		)

		expect(result.items.length).toBe(0)
	})
})
