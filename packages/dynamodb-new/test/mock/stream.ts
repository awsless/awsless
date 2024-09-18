import {
	define,
	object,
	string,
	mockDynamoDB,
	number,
	streamTable,
	putItem,
	updateItem,
	deleteItem,
	batchPutItem,
	batchDeleteItem,
	transactWrite,
	transactPut,
	transactUpdate,
	transactDelete,
} from '../../src'

describe('Mock Stream', () => {
	const users = define('users', {
		hash: 'id',
		schema: object({
			id: number(),
			name: string(),
		}),
	})

	const process = vitest.fn()

	mockDynamoDB({
		tables: [users],
		stream: [streamTable(users, process)],
	})

	beforeEach(() => {
		process.mockClear()
	})

	it('put', async () => {
		await putItem(users, { id: 1, name: 'Jack' })

		expect(process).toBeCalledWith({
			Records: [
				{
					eventName: 'INSERT',
					dynamodb: {
						Keys: { id: { N: '1' } },
						NewImage: { id: { N: '1' }, name: { S: 'Jack' } },
						OldImage: undefined,
					},
				},
			],
		})
	})

	it('update', async () => {
		await updateItem(
			users,
			{ id: 1 },
			{
				update: exp => exp.update('name').set('Black'),
			}
		)

		expect(process).toBeCalledWith({
			Records: [
				{
					eventName: 'MODIFY',
					dynamodb: {
						Keys: { id: { N: '1' } },
						NewImage: { id: { N: '1' }, name: { S: 'Black' } },
						OldImage: { id: { N: '1' }, name: { S: 'Jack' } },
					},
				},
			],
		})
	})

	it('delete', async () => {
		await deleteItem(users, { id: 1 })

		expect(process).toBeCalledWith({
			Records: [
				{
					eventName: 'REMOVE',
					dynamodb: {
						Keys: { id: { N: '1' } },
						NewImage: undefined,
						OldImage: { id: { N: '1' }, name: { S: 'Black' } },
					},
				},
			],
		})
	})

	it('batch put', async () => {
		await batchPutItem(users, [
			{ id: 1, name: 'Jack' },
			{ id: 2, name: 'Black' },
		])

		expect(process).toBeCalledWith({
			Records: [
				{
					eventName: 'INSERT',
					dynamodb: {
						Keys: { id: { N: '1' } },
						NewImage: { id: { N: '1' }, name: { S: 'Jack' } },
						OldImage: undefined,
					},
				},
				{
					eventName: 'INSERT',
					dynamodb: {
						Keys: { id: { N: '2' } },
						NewImage: { id: { N: '2' }, name: { S: 'Black' } },
						OldImage: undefined,
					},
				},
			],
		})
	})

	it('batch delete', async () => {
		await batchDeleteItem(users, [{ id: 1 }, { id: 2 }])

		expect(process).toBeCalledWith({
			Records: [
				{
					eventName: 'REMOVE',
					dynamodb: {
						Keys: { id: { N: '1' } },
						NewImage: undefined,
						OldImage: { id: { N: '1' }, name: { S: 'Jack' } },
					},
				},
				{
					eventName: 'REMOVE',
					dynamodb: {
						Keys: { id: { N: '2' } },
						NewImage: undefined,
						OldImage: { id: { N: '2' }, name: { S: 'Black' } },
					},
				},
			],
		})
	})

	it('transact write', async () => {
		await transactWrite({
			items: [
				transactPut(users, { id: 1, name: 'Jack' }),
				transactUpdate(
					users,
					{ id: 2 },
					{
						update: exp => exp.update('name').set('Black'),
					}
				),
				transactDelete(users, { id: 3 }),
			],
		})

		expect(process).toBeCalledWith({
			Records: [
				{
					eventName: 'INSERT',
					dynamodb: {
						Keys: { id: { N: '1' } },
						NewImage: { id: { N: '1' }, name: { S: 'Jack' } },
						OldImage: undefined,
					},
				},
			],
		})

		expect(process).toBeCalledWith({
			Records: [
				{
					eventName: 'INSERT',
					dynamodb: {
						Keys: { id: { N: '2' } },
						NewImage: { id: { N: '2' }, name: { S: 'Black' } },
						OldImage: undefined,
					},
				},
			],
		})

		expect(process).toBeCalledWith({
			Records: [
				{
					eventName: 'REMOVE',
					dynamodb: {
						Keys: { id: { N: '3' } },
						NewImage: undefined,
						OldImage: undefined,
					},
				},
			],
		})
	})
})
