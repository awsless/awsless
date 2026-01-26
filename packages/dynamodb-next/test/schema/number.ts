import { randomUUID } from 'crypto'
import { define, getItem, Infer, mockDynamoDB, number, object, putItem, string, updateItem } from '../../src'

describe('number', () => {
	const table = define('table', {
		hash: 'id',
		schema: object({
			id: string(),
			count: number(),
		}),
	})

	mockDynamoDB({ tables: [table] })

	const id = randomUUID()
	const item: Infer<typeof table> = {
		id,
		count: 0,
	}

	it('put', async () => {
		await putItem(table, item)
	})

	it('get', async () => {
		const result = await getItem(table, { id })

		expectTypeOf(result).toEqualTypeOf<
			| undefined
			| {
					id: string
					count: number
			  }
		>()

		expect(result).toStrictEqual(item)
	})

	it('update incr', async () => {
		const result = await updateItem(
			table,
			{ id },
			{
				return: 'ALL_NEW',
				update: e => [e.count.incr(10)],
				when: e => [e.count.eq(0)],
			}
		)

		expect(result).toStrictEqual({
			id,
			count: 10,
		})
	})

	it('update decr', async () => {
		const result = await updateItem(
			table,
			{ id },
			{
				return: 'ALL_NEW',
				update: e => [e.count.decr(5)],
			}
		)

		expect(result).toStrictEqual({
			id,
			count: 5,
		})
	})
})
