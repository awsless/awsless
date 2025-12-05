import { define, getItem, Infer, mockDynamoDB, number, object, putItem, record, updateItem } from '../../src'

describe('record', () => {
	const table = define('table', {
		hash: 'key',
		schema: object({
			key: number(),
			record: record(object({})),
		}),
	})

	mockDynamoDB({ tables: [table] })

	const item: Infer<typeof table> = {
		key: 1,
		record: { a: {} },
	}

	it('put', async () => {
		await putItem(table, item)
	})

	it('get', async () => {
		const result = await getItem(table, { key: 1 })

		expectTypeOf(result).toEqualTypeOf<
			| undefined
			| {
					key: number
					record: Record<string, object>
			  }
		>()

		expect(result).toStrictEqual(item)
	})

	it('update', async () => {
		const result = await updateItem(
			table,
			{ key: 1 },
			{
				return: 'ALL_NEW',
				update: e => [
					//
					e.record.at('b').set({}),
					e.record.at('c').set({}),
				],
				when: e => [
					//
					e.record.at('a').eq({}),
				],
			}
		)

		expect(result).toStrictEqual({
			key: 1,
			record: {
				a: {},
				b: {},
				c: {},
			},
		})
	})

	it('delete', async () => {
		const result = await updateItem(
			table,
			{ key: 1 },
			{
				return: 'ALL_NEW',
				update: e => [
					//
					e.record.at('a').delete(),
					e.record.at('b').delete(),
					e.record.at('c').delete(),
				],
			}
		)

		expect(result).toStrictEqual({
			key: 1,
			record: {},
		})
	})
})
