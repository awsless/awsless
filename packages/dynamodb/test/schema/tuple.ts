import { randomUUID, UUID } from 'crypto'
import {
	define,
	getItem,
	Infer,
	mockDynamoDB,
	number,
	object,
	putItem,
	string,
	tuple,
	updateItem,
	uuid,
} from '../../src'

describe('tuple', () => {
	const table = define('table', {
		hash: 'id',
		schema: object({
			id: uuid(),
			tuple: tuple([string(), string()], number()),
		}),
	})

	mockDynamoDB({ tables: [table] })

	const id = randomUUID()
	const item: Infer<typeof table> = {
		id,
		tuple: ['1', '2'],
	}

	it('put', async () => {
		await putItem(table, item)
	})

	it('get', async () => {
		const result = await getItem(table, { id })

		expectTypeOf(result).toEqualTypeOf<
			| undefined
			| {
					id: UUID
					tuple: [string, string, ...number[]]
			  }
		>()

		expect(result).toStrictEqual(item)
	})

	it('update', async () => {
		const result = await updateItem(
			table,
			{ id },
			{
				return: 'ALL_NEW',
				update: e => [
					//
					e.tuple.at(2).set(1),
				],
				when: e => [
					//
					e.tuple.at(0).exists(),
				],
			}
		)

		expect(result).toStrictEqual({
			id,
			tuple: ['1', '2', 1],
		})
	})

	it('delete', async () => {
		const result = await updateItem(
			table,
			{ id },
			{
				return: 'ALL_NEW',
				update: e => [
					//
					e.tuple.at(2).delete(),
				],
			}
		)

		expect(result).toStrictEqual({
			id,
			tuple: ['1', '2'],
		})
	})
})
