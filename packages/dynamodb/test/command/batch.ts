import { deleteItems, getItems, mockDynamoDB, putItems } from '../../src/index'
import { users } from '../aws/tables'

describe('Batch', () => {
	mockDynamoDB({ tables: [users] })

	it('should batch put items', async () => {
		await putItems(users, [
			{ id: 1, name: '' },
			{ id: 2, name: '' },
			{ id: 3, name: '' },
		])
	})

	it('should batch get items', async () => {
		const result = await getItems(users, [
			//
			{ id: 1 },
			{ id: 2 },
			{ id: 3 },
			{ id: 1000 },
		])

		expect(result).toStrictEqual([
			//
			{ id: 1, name: '' },
			{ id: 2, name: '' },
			{ id: 3, name: '' },
			undefined,
		])

		expectTypeOf(result).toEqualTypeOf<
			Array<
				| undefined
				| {
						id: number
						name: string
						deletedAt?: Date
				  }
			>
		>()
	})

	it('should filter non existent items', async () => {
		const result = await getItems(
			users,
			[
				//
				{ id: 1 },
				{ id: 2 },
				{ id: 3 },
				{ id: 1000 },
			],
			{
				filterNonExistentItems: true,
			}
		)

		expect(result).toStrictEqual([
			{ id: 1, name: '' },
			{ id: 2, name: '' },
			{ id: 3, name: '' },
		])

		expectTypeOf(result).toEqualTypeOf<
			{
				id: number
				name: string
				deletedAt?: Date
			}[]
		>()
	})

	it('should batch delete items', async () => {
		await deleteItems(users, [{ id: 1 }, { id: 2 }, { id: 3 }])

		const result = await getItems(users, [{ id: 1 }, { id: 2 }, { id: 3 }])

		expect(result).toStrictEqual([undefined, undefined, undefined])
	})

	describe('should work with big data', () => {
		const name = Array.from({ length: 100000 })
			.map(() => 'xxx')
			.join(' ')

		const limit = 100
		const ids = Array.from({ length: limit }).map((_, id) => id + 1)

		const keyList = ids.map(id => ({ id }))
		const userList = ids.map(id => ({ id, name }))
		const emptyList = ids.map(() => undefined)

		it('put', async () => {
			await putItems(users, userList)
		})

		it('get', async () => {
			const result = await getItems(users, keyList)

			expect(result).toStrictEqual(userList)
		})

		it('delete', async () => {
			await deleteItems(users, keyList)
			const result = await getItems(users, keyList)

			expect(result).toStrictEqual(emptyList)
		})
	})
})
