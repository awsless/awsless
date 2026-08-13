import { define, object, string, mockDynamoDB, scan, seedTable, number } from '../../src'

describe('Mock Seed', () => {
	const user1 = define('users1', {
		hash: 'id',
		schema: object({
			id: number(),
			name: string()
		}),
	})

	const user2 = define('users2', {
		hash: 'id',
		schema: object({
			id: number(),
			user: string()
		}),
	})

	mockDynamoDB({
		tables: [ user1, user2 ],
		seed: [
			seedTable(user1, [{
				id: 1,
				name: 'foo',
			}]),
			seedTable(user2, [{
				id: 1,
				user: 'foo',
			},
			{
				id: 2,
				user: 'bar',
			}])
		]
	})

	it('should seed dynamodb before running tests', async () => {
		const result = await scan(user1)
		expect(result).toStrictEqual({
			cursor: undefined,
			count: 1,
			items: [
				{
					id: 1,
					name: 'foo',
				}
			]
		})
	})

	it('should seed dynamodb for a different table', async () => {
		const result = await scan(user2)
		expect(result).toStrictEqual({
			cursor: undefined,
			count: 2,
			items: [
				{
					id: 2,
					user: 'bar',
				},
				{
					id: 1,
					user: 'foo',
				}
			]
		})
	})
})
