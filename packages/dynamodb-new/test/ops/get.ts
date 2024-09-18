
import { getItem, mockDynamoDB, putItem } from '../../src/index'
import { users } from '../aws/tables'

describe('Get', () => {

	mockDynamoDB({ tables: [ users ] })

	const user = { id: 1, name: 'Jack' }

	it('should return undefined for unknown item', async () => {
		const result = await getItem(users, { id: 1 })
		expect(result).toBeUndefined()
	})

	it('should get item', async () => {
		await putItem(users, user)
		const result = await getItem(users, { id: 1 })
		expect(result).toStrictEqual(user)
	})

	it('should only project given properties', async () => {
		const result = await getItem(users, { id: 1 }, {
			projection: ['name']
		})

		expectTypeOf(result).toEqualTypeOf<{ name:string } | undefined>()
		expect(result).toStrictEqual({ name: 'Jack' })
	})
})
