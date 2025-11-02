import { randomUUID, UUID } from 'crypto'
import { define, getItem, Infer, mockDynamoDB, number, object, putItem, string, updateItem, uuid } from '../../src'

describe('Object', () => {
	const table = define('table', {
		hash: 'id',
		schema: object({
			id: uuid(),
			objectRest: object({ id: string() }, number()),
			object: object({ id: string() }),
		}),
	})

	mockDynamoDB({ tables: [table] })

	const id = randomUUID()
	const item: Infer<typeof table> = {
		id,
		objectRest: {
			id: '1',
			n1: 1,
		},
		object: {
			id: '1',
		},
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
					object: {
						id: string
					}
					objectRest: {
						id: string
						[key: string]: string | number
					}
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
					e.objectRest.id.set('2'),
					e.objectRest.at('n1').set(1),
					e.objectRest.at('n2').set(2),
					e.objectRest.at('n3').set(3),
				],
				when: e => [
					//
					e.objectRest.at('n3').notExists(),
					e.objectRest.at('n1').eq(1),
				],
			}
		)

		expect(result).toStrictEqual({
			id,
			object: {
				id: '1',
			},
			objectRest: {
				id: '2',
				n1: 1,
				n2: 2,
				n3: 3,
			},
		})
	})
})
