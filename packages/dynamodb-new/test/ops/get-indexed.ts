
import { define, getIndexedItem, mockDynamoDB, number, object, putItem, string } from '../../src/index'

describe('Get Index', () => {

	const users = define('users', {
		hash: 'id',
		schema: object({
			id: number(),
			name: string(),
		}),
		indexes: {
			name: { hash: 'name' },
			deep: { hash: 'id', sort: 'name' }
		}
	})

	mockDynamoDB({ tables: [ users ] })

	const user = { id: 1, name: 'Jack' }

	it('should return undefined for unknown item', async () => {
		const result = await getIndexedItem(users, { name: 'Jack' }, {
			index: 'name'
		})
		expect(result).toBeUndefined()
	})

	it('should get item', async () => {
		await putItem(users, user)
		const result = await getIndexedItem(users, { name: 'Jack' }, {
			index: 'name'
		})
		expect(result).toStrictEqual(user)
	})

	it('should get item with a sort key', async () => {
		const result = await getIndexedItem(users, { id: 1, name: 'Jack' }, {
			index: 'deep'
		})
		expect(result).toStrictEqual(user)
	})

	it('should only project given properties', async () => {
		const result = await getIndexedItem(users, { name: 'Jack' }, {
			index: 'name',
			projection: ['name']
		})

		expectTypeOf(result).toEqualTypeOf<{ name:string } | undefined>()
		expect(result).toStrictEqual({ name: 'Jack' })
	})
})
