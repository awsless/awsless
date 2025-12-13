import { define, getIndexItems, mockDynamoDB, number, object, putItems, string } from '../../src/index'

describe('getIndexItems', () => {
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

	const jack = { id: 1, name: 'Jack' }
	const jane = { id: 2, name: 'Jane' }

	it('should return undefined for unknown items', async () => {
		const result = await getIndexItems(users, 'name', [{ name: 'Jack' }, { name: 'Jane' }])
		expect(result).toStrictEqual([undefined, undefined])
	})

	it('should get items', async () => {
		await putItems(users, [jack, jane])

		const result = await getIndexItems(users, 'name', [{ name: 'Jack' }, { name: 'Jane' }])

		expect(result).toStrictEqual([jack, jane])
	})

	it('should only project given properties', async () => {
		const result = await getIndexItems(users, 'name', [{ name: 'Jack' }, { name: 'Jane' }], {
			select: ['name'],
		})

		expect(result).toStrictEqual([{ name: 'Jack' }, { name: 'Jane' }])
		expectTypeOf(result).toEqualTypeOf<Array<{ name: string } | undefined>>()
	})

	it('should filter non existent items', async () => {
		const result = await getIndexItems(users, 'name', [{ name: 'Jack' }, { name: 'Jane' }, { name: 'Unknown' }], {
			filterNonExistentItems: true,
		})

		expect(result).toStrictEqual([jack, jane])
		expectTypeOf(result).toEqualTypeOf<{ id: number; name: string }[]>()
	})
})
