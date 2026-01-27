import { randomUUID, UUID } from 'crypto'
import { array, define, getItem, Infer, mockDynamoDB, number, object, putItem, updateItem, uuid } from '../../src'

describe('array', () => {
	const table = define('table', {
		hash: 'id',
		schema: object({
			id: uuid(),
			array: array(number()),
		}),
	})

	mockDynamoDB({ tables: [table] })

	const id = randomUUID()
	const item: Infer<typeof table> = {
		id,
		array: [1],
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
					array: number[]
			  }
		>()

		expect(result).toStrictEqual(item)
	})

	it('update push', async () => {
		const result = await updateItem(
			table,
			{ id },
			{
				return: 'ALL_NEW',
				update: e => [
					//
					// e.array.at(1).set(2),
					e.array.push(2),
				],
				when: e => [
					//
					e.array.at(0).exists(),
				],
			}
		)

		expect(result).toStrictEqual({
			id,
			array: [1, 2],
		})
	})

	it('update delete', async () => {
		const result = await updateItem(
			table,
			{ id },
			{
				return: 'ALL_NEW',
				update: e => [
					//
					e.array.at(0).delete(),
				],
				when: e => [
					//
					e.array.contains(1),
				],
			}
		)

		expect(result).toStrictEqual({
			id,
			array: [2],
		})
	})
})
