
import { mockDynamoDB, putItem, scan } from '../../src/index'
import { users } from '../aws/tables'

describe('Scan', () => {

	mockDynamoDB({ tables: [ users ] })

	it('should scan list', async () => {
		await putItem(users, { id: 1, name: '' })
		await putItem(users, { id: 2, name: '' })
		await putItem(users, { id: 3, name: '' })

		const result = await scan(users)

		expect(result).toStrictEqual({
			cursor: undefined,
			count: 3,
			items: [
				{ id: 2, name: '' },
				{ id: 1, name: '' },
				{ id: 3, name: '' },
			],
		})
	})

	it('should support limit & cursor', async () => {
		const result1 = await scan(users, {
			limit: 1,
		})

		expectTypeOf(result1.cursor).toMatchTypeOf<{ id: number } | undefined>()

		expect(result1).toStrictEqual({
			count: 1,
			cursor: { id: 2 },
			items: [
				{ id: 2, name: '' },
			],
		})

		const result2 = await scan(users, {
			cursor: result1.cursor,
			limit: 1,
		})

		expect(result2).toStrictEqual({
			count: 1,
			cursor: { id: 1 },
			items: [
				{ id: 1, name: '' },
			],
		})
	})
})
