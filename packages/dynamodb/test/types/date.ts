
import { define, number, object, string, date, putItem, query, mockDynamoDB } from '../../src'

describe('Date Type', () => {

	const users = define('users', {
		hash: 'id',
		sort: 'createdAt',
		schema: object({
			id: number(),
			name: string(),
			createdAt: date(),
		}),
	})

	mockDynamoDB({ tables: [ users ] })

	it('date', async () => {
		await putItem(users, {
			id: 1,
			name: 'Jack',
			createdAt: new Date(),
		})

		const result = await query(users, {
			keyCondition: (exp) => exp
				.where('id').eq(1)
				.and
				.where('createdAt').gt(new Date(0))
		})

		expect(result.count).toBe(1)
	})
})
