import {
	define,
	getItem,
	Infer,
	mockDynamoDB,
	number,
	object,
	optional,
	putItem,
	set,
	string,
	updateItem,
} from '../../src'

describe('optional set', () => {
	const table = define('table', {
		hash: 'id',
		schema: object({
			id: number(),
			set: optional(set(string())),
		}),
	})

	mockDynamoDB({ tables: [table] })

	const item: Infer<typeof table> = {
		id: 1,
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
					set?: Set<string>
			  }
		>()

		expect(result).toStrictEqual({
			id: 1,
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
					e.set.set(new Set()),
				],
				when: e => [
					//
					e.set.eq(undefined),
				],
			}
		)

		expect(result).toStrictEqual({
			id: 1,
			set: new Set(),
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
					e.set.add('hello'),
				],
				when: e => [
					//
					e.set.eq(new Set()),
					// e.set.nq(undefined),
				],
			}
		)

		expect(result).toStrictEqual({
			id: 1,
			set: new Set(['hello']),
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
					e.set.remove('hello'),
				],
			}
		)

		expect(result).toStrictEqual({
			id: 1,
			set: new Set(),
		})
	})

	it('update delete', async () => {
		const result = await updateItem(
			table,
			{ id: 1 },
			{
				return: 'ALL_NEW',
				update: e => [
					//
					e.set.delete(),
				],
			}
		)

		expect(result).toStrictEqual({
			id: 1,
		})
	})
})
