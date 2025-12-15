import { define, getItem, mockDynamoDB, number, object, optional, putItem, string, transactRead } from '../../src/index'

describe('Transact Read', () => {
	const users = define('users', {
		hash: 'id',
		schema: object({
			id: number(),
			name: optional(string()),
		}),
	})

	mockDynamoDB({ tables: [users] })

	it('seed', async () => {
		await Promise.all([
			//
			putItem(users, { id: 1, name: '' }),
			putItem(users, { id: 2, name: '' }),
			putItem(users, { id: 3, name: '' }),
		])
	})

	it('should transactRead', async () => {
		const result = await transactRead([
			getItem(users, { id: 1 }),
			getItem(users, { id: 2 }),
			getItem(users, { id: 3 }),
		])

		expect(result).toStrictEqual([
			//
			{ id: 1, name: '' },
			{ id: 2, name: '' },
			{ id: 3, name: '' },
		])

		expectTypeOf(result).toEqualTypeOf<
			[
				//
				{ id: number; name?: string } | undefined,
				{ id: number; name?: string } | undefined,
				{ id: number; name?: string } | undefined,
			]
		>()
	})

	it('should transactRead with projection', async () => {
		const result = await transactRead([
			getItem(users, { id: 1 }, { select: ['id'] }),
			getItem(users, { id: 2 }, { select: ['id'] }),
			getItem(users, { id: 3 }, { select: ['id'] }),
		])

		expect(result).toStrictEqual([
			//
			{ id: 1 },
			{ id: 2 },
			{ id: 3 },
		])

		expectTypeOf(result).toEqualTypeOf<
			[
				//
				{ id: number } | undefined,
				{ id: number } | undefined,
				{ id: number } | undefined,
			]
		>()
	})

	it('should return partial data', async () => {
		const result = await transactRead([
			getItem(users, { id: 1 }),
			getItem(users, { id: 2 }),
			getItem(users, { id: 999 }),
		])

		expect(result).toStrictEqual([
			//
			{ id: 1, name: '' },
			{ id: 2, name: '' },
			undefined,
		])
	})
})
