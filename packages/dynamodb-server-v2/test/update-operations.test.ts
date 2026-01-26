import { CreateTableCommand, GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { DynamoDBServer } from '../src/index.js'

describe('Update Operations', () => {
	const server = new DynamoDBServer()

	beforeAll(async () => {
		await server.listen()
	})

	afterAll(async () => {
		await server.stop()
	})

	beforeEach(async () => {
		server.reset()

		const client = server.getClient()
		await client.send(
			new CreateTableCommand({
				TableName: 'TestTable',
				KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
				AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
				BillingMode: 'PAY_PER_REQUEST',
			})
		)
	})

	describe('Increment / Decrement', () => {
		it('should increment a numeric value', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, counter: { N: '10' } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'SET counter = counter + :inc',
					ExpressionAttributeValues: { ':inc': { N: '5' } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.counter?.N).toBe('15')
		})

		it('should decrement a numeric value', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, counter: { N: '10' } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'SET counter = counter - :dec',
					ExpressionAttributeValues: { ':dec': { N: '3' } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.counter?.N).toBe('7')
		})

		it('should increment using ADD on an existing number', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, counter: { N: '5' } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'ADD counter :inc',
					ExpressionAttributeValues: { ':inc': { N: '10' } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.counter?.N).toBe('15')
		})

		it('should decrement using ADD with a negative number', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, counter: { N: '20' } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'ADD counter :dec',
					ExpressionAttributeValues: { ':dec': { N: '-7' } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.counter?.N).toBe('13')
		})

		it('should initialize a new attribute using ADD on a non-existent number', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'ADD counter :inc',
					ExpressionAttributeValues: { ':inc': { N: '1' } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.counter?.N).toBe('1')
		})
	})

	describe('Append / Remove (Sets)', () => {
		it('should add elements to a string set', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, tags: { SS: ['a', 'b'] } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'ADD tags :newTags',
					ExpressionAttributeValues: { ':newTags': { SS: ['c', 'd'] } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.tags?.SS?.sort()).toEqual(['a', 'b', 'c', 'd'])
		})

		it('should not duplicate elements when adding to a string set', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, tags: { SS: ['a', 'b'] } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'ADD tags :newTags',
					ExpressionAttributeValues: { ':newTags': { SS: ['b', 'c'] } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.tags?.SS?.sort()).toEqual(['a', 'b', 'c'])
		})

		it('should remove elements from a string set using DELETE', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, tags: { SS: ['a', 'b', 'c', 'd'] } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'DELETE tags :removeTags',
					ExpressionAttributeValues: { ':removeTags': { SS: ['b', 'd'] } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.tags?.SS?.sort()).toEqual(['a', 'c'])
		})

		it('should add elements to a number set', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, scores: { NS: ['1', '2'] } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'ADD scores :newScores',
					ExpressionAttributeValues: { ':newScores': { NS: ['3', '4'] } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.scores?.NS?.sort()).toEqual(['1', '2', '3', '4'])
		})

		it('should remove elements from a number set using DELETE', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, scores: { NS: ['1', '2', '3', '4'] } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'DELETE scores :removeScores',
					ExpressionAttributeValues: { ':removeScores': { NS: ['2', '4'] } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.scores?.NS?.sort()).toEqual(['1', '3'])
		})

		it('should create a new set using ADD on a non-existent attribute', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'ADD tags :newTags',
					ExpressionAttributeValues: { ':newTags': { SS: ['x', 'y'] } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.tags?.SS?.sort()).toEqual(['x', 'y'])
		})
	})

	describe('List Append / Remove', () => {
		it('should append to a list using list_append', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, items: { L: [{ S: 'a' }, { S: 'b' }] } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'SET items = list_append(items, :newItems)',
					ExpressionAttributeValues: { ':newItems': { L: [{ S: 'c' }] } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.items?.L).toEqual([{ S: 'a' }, { S: 'b' }, { S: 'c' }])
		})

		it('should prepend to a list using list_append', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, items: { L: [{ S: 'b' }, { S: 'c' }] } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'SET items = list_append(:newItems, items)',
					ExpressionAttributeValues: { ':newItems': { L: [{ S: 'a' }] } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.items?.L).toEqual([{ S: 'a' }, { S: 'b' }, { S: 'c' }])
		})

		it('should remove a list element by index using REMOVE', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, items: { L: [{ S: 'a' }, { S: 'b' }, { S: 'c' }] } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'REMOVE items[1]',
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.items?.L).toEqual([{ S: 'a' }, { S: 'c' }])
		})

		it('should remove multiple list elements by index', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, items: { L: [{ S: 'a' }, { S: 'b' }, { S: 'c' }, { S: 'd' }] } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'REMOVE items[1], items[3]',
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.items?.L).toEqual([{ S: 'a' }, { S: 'c' }])
		})

		it('should set a list element by index', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, items: { L: [{ S: 'a' }, { S: 'b' }, { S: 'c' }] } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'SET items[1] = :val',
					ExpressionAttributeValues: { ':val': { S: 'z' } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.items?.L).toEqual([{ S: 'a' }, { S: 'z' }, { S: 'c' }])
		})
	})

	describe('Combined Operations', () => {
		it('should SET and REMOVE in one expression', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, name: { S: 'Alice' }, age: { N: '25' }, temp: { S: 'delete-me' } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'SET #n = :name, age = :age REMOVE temp',
					ExpressionAttributeNames: { '#n': 'name' },
					ExpressionAttributeValues: { ':name': { S: 'Bob' }, ':age': { N: '30' } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.name?.S).toBe('Bob')
			expect(result.Item?.age?.N).toBe('30')
			expect(result.Item?.temp).toBeUndefined()
		})

		it('should SET and ADD in one expression', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, name: { S: 'Alice' }, counter: { N: '10' } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'SET #n = :name ADD counter :inc',
					ExpressionAttributeNames: { '#n': 'name' },
					ExpressionAttributeValues: { ':name': { S: 'Bob' }, ':inc': { N: '5' } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.name?.S).toBe('Bob')
			expect(result.Item?.counter?.N).toBe('15')
		})

		it('should SET and DELETE in one expression', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, status: { S: 'active' }, tags: { SS: ['a', 'b', 'c'] } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'SET #s = :status DELETE tags :removeTags',
					ExpressionAttributeNames: { '#s': 'status' },
					ExpressionAttributeValues: { ':status': { S: 'inactive' }, ':removeTags': { SS: ['b'] } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.status?.S).toBe('inactive')
			expect(result.Item?.tags?.SS?.sort()).toEqual(['a', 'c'])
		})

		it('should SET, ADD, and REMOVE in one expression', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, name: { S: 'Alice' }, counter: { N: '10' }, temp: { S: 'delete-me' } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'SET #n = :name ADD counter :inc REMOVE temp',
					ExpressionAttributeNames: { '#n': 'name' },
					ExpressionAttributeValues: { ':name': { S: 'Bob' }, ':inc': { N: '3' } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.name?.S).toBe('Bob')
			expect(result.Item?.counter?.N).toBe('13')
			expect(result.Item?.temp).toBeUndefined()
		})

		it('should SET, ADD, DELETE, and REMOVE in one expression', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: {
						id: { S: '1' },
						name: { S: 'Alice' },
						counter: { N: '10' },
						tags: { SS: ['a', 'b', 'c'] },
						temp: { S: 'delete-me' },
					},
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'SET #n = :name ADD counter :inc DELETE tags :removeTags REMOVE temp',
					ExpressionAttributeNames: { '#n': 'name' },
					ExpressionAttributeValues: {
						':name': { S: 'Bob' },
						':inc': { N: '7' },
						':removeTags': { SS: ['a', 'c'] },
					},
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.name?.S).toBe('Bob')
			expect(result.Item?.counter?.N).toBe('17')
			expect(result.Item?.tags?.SS).toEqual(['b'])
			expect(result.Item?.temp).toBeUndefined()
		})

		it('should SET multiple attributes and append to a list in one expression', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: {
						id: { S: '1' },
						name: { S: 'Alice' },
						items: { L: [{ S: 'a' }] },
					},
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'SET #n = :name, items = list_append(items, :newItems)',
					ExpressionAttributeNames: { '#n': 'name' },
					ExpressionAttributeValues: { ':name': { S: 'Bob' }, ':newItems': { L: [{ S: 'b' }] } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.name?.S).toBe('Bob')
			expect(result.Item?.items?.L).toEqual([{ S: 'a' }, { S: 'b' }])
		})

		it('should increment and use if_not_exists in one expression', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, views: { N: '100' } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'SET views = views + :inc, likes = if_not_exists(likes, :zero)',
					ExpressionAttributeValues: { ':inc': { N: '1' }, ':zero': { N: '0' } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.views?.N).toBe('101')
			expect(result.Item?.likes?.N).toBe('0')
		})
	})

	describe('if_not_exists', () => {
		it('should set value only if attribute does not exist', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' }, counter: { N: '5' } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'SET counter = if_not_exists(counter, :default)',
					ExpressionAttributeValues: { ':default': { N: '0' } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.counter?.N).toBe('5')
		})

		it('should set default value if attribute does not exist', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'TestTable',
					Item: { id: { S: '1' } },
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'TestTable',
					Key: { id: { S: '1' } },
					UpdateExpression: 'SET counter = if_not_exists(counter, :default)',
					ExpressionAttributeValues: { ':default': { N: '0' } },
				})
			)

			const result = await client.send(new GetItemCommand({ TableName: 'TestTable', Key: { id: { S: '1' } } }))

			expect(result.Item?.counter?.N).toBe('0')
		})
	})
})
