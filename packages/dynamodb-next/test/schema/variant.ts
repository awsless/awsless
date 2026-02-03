import {
	array,
	define,
	deleteItem,
	getItem,
	Infer,
	mockDynamoDB,
	number,
	object,
	putItem,
	updateItem,
	variant,
} from '../../src'

describe('variant', () => {
	const table = define('table', {
		hash: 'id',
		schema: object({
			id: number(),
			list: array(
				variant('type', {
					one: object({
						foo: number(),
					}),
					two: object({
						bar: number(),
					}),
				})
			),
		}),
	})

	mockDynamoDB({ tables: [table] })

	const item: Infer<typeof table> = {
		id: 1,
		list: [
			{ type: 'one', foo: 1 },
			{ type: 'two', bar: 2 },
		],
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
					list: Array<{ type: 'one'; foo: number } | { type: 'two'; bar: number }>
			  }
		>()

		expect(result).toStrictEqual(item)
	})

	it('update', async () => {
		const result = await updateItem(
			table,
			{ id: 1 },
			{
				return: 'ALL_NEW',
				update: e => [
					e.list.append({
						type: 'two',
						bar: 3,
					}),
				],
				when: e => [
					e.list.at(0).eq({
						type: 'one',
						foo: 1,
					}),
				],
			}
		)

		expect(result).toStrictEqual({
			id: 1,
			list: [
				{
					type: 'one',
					foo: 1,
				},
				{
					type: 'two',
					bar: 2,
				},
				{
					type: 'two',
					bar: 3,
				},
			],
		})
	})

	it('delete', async () => {
		const result = await updateItem(
			table,
			{ id: 1 },
			{
				return: 'ALL_NEW',
				update: e => [
					//
					e.list.at(1).delete(),
					e.list.at(2).delete(),
				],
			}
		)

		expect(result).toStrictEqual({
			id: 1,
			list: [
				{
					type: 'one',
					foo: 1,
				},
			],
		})
	})

	it('fail on unsupported update', async () => {
		await expect(async () => {
			await updateItem(
				table,
				{ id: 1 },
				{
					// @ts-ignore
					update: e => e.list.at(0).bar.set(4),
				}
			)
		}).rejects.toThrow(TypeError)
	})

	it('fail on unsupported conditon', async () => {
		await expect(async () => {
			await deleteItem(
				table,
				{ id: 1 },
				{
					// @ts-ignore
					when: e => e.list.at(0).bar.eq(4),
				}
			)
		}).rejects.toThrow(TypeError)
	})
})
