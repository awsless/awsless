import { define, getItem, Infer, mockDynamoDB, number, object, putItem, set, string, updateItem } from '../../src'

describe('set', () => {
	const table = define('table', {
		hash: 'id',
		schema: object({
			id: number(),
			object: object({
				set: set(string()),
			}),
		}),
	})

	mockDynamoDB({ tables: [table] })

	const item: Infer<typeof table> = {
		id: 1,
		object: {
			set: new Set(),
		},
	}

	it('put', async () => {
		await putItem(table, item)
	})

	it('get', async () => {
		const result = await getItem(table, { id: 1 })

		expectTypeOf(result).toEqualTypeOf<
			| undefined
			| {
					id: number
					object: {
						set?: Set<string>
					}
			  }
		>()

		expect(result).toStrictEqual({
			id: 1,
			object: {},
		})
	})

	it('update set', async () => {
		const result = await updateItem(
			table,
			{ id: 1 },
			{
				return: 'ALL_NEW',
				update: e => [
					//
					e.object.set.set(new Set()),
				],
				when: e => [
					//
					e.object.set.eq(new Set()),
				],
			}
		)

		expect(result).toStrictEqual({
			id: 1,
			object: {},
		})
	})

	it('update append', async () => {
		const result = await updateItem(
			table,
			{ id: 1 },
			{
				return: 'ALL_NEW',
				update: e => [
					//
					e.object.set.append(new Set(['hello'])),
				],
				when: e => [
					//
					e.object.set.eq(new Set()),
				],
			}
		)

		expect(result).toStrictEqual({
			id: 1,
			object: {
				set: new Set(['hello']),
			},
		})
	})

	it('update remove', async () => {
		const result = await updateItem(
			table,
			{ id: 1 },
			{
				return: 'ALL_NEW',
				update: e => [
					//
					e.object.set.remove(new Set(['hello'])),
				],
			}
		)

		expect(result).toStrictEqual({
			id: 1,
			object: {},
		})
	})
})
