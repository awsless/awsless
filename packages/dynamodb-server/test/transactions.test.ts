import {
	CreateTableCommand,
	GetItemCommand,
	PutItemCommand,
	TransactGetItemsCommand,
	TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { DynamoDBServer } from '../src/index.js'

describe('Transaction Operations', () => {
	let server: DynamoDBServer

	beforeAll(async () => {
		server = new DynamoDBServer()
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
				TableName: 'Accounts',
				KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
				AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
				BillingMode: 'PAY_PER_REQUEST',
			})
		)
	})

	describe('TransactWriteItems', () => {
		it('should execute multiple writes atomically', async () => {
			const client = server.getClient()

			await client.send(
				new TransactWriteItemsCommand({
					TransactItems: [
						{
							Put: {
								TableName: 'Accounts',
								Item: {
									id: { S: 'account#1' },
									balance: { N: '1000' },
								},
							},
						},
						{
							Put: {
								TableName: 'Accounts',
								Item: {
									id: { S: 'account#2' },
									balance: { N: '500' },
								},
							},
						},
					],
				})
			)

			const result1 = await client.send(
				new GetItemCommand({
					TableName: 'Accounts',
					Key: { id: { S: 'account#1' } },
				})
			)

			const result2 = await client.send(
				new GetItemCommand({
					TableName: 'Accounts',
					Key: { id: { S: 'account#2' } },
				})
			)

			expect(result1.Item?.balance?.N).toBe('1000')
			expect(result2.Item?.balance?.N).toBe('500')
		})

		it('should rollback on condition failure', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'Accounts',
					Item: {
						id: { S: 'existing' },
						balance: { N: '100' },
					},
				})
			)

			try {
				await client.send(
					new TransactWriteItemsCommand({
						TransactItems: [
							{
								Put: {
									TableName: 'Accounts',
									Item: {
										id: { S: 'new#1' },
										balance: { N: '200' },
									},
								},
							},
							{
								Put: {
									TableName: 'Accounts',
									Item: {
										id: { S: 'existing' },
										balance: { N: '999' },
									},
									ConditionExpression: 'attribute_not_exists(id)',
								},
							},
						],
					})
				)
				expect(true).toBe(false)
			} catch (error: any) {
				expect(error.name).toBe('TransactionCanceledException')
			}

			const result = await client.send(
				new GetItemCommand({
					TableName: 'Accounts',
					Key: { id: { S: 'new#1' } },
				})
			)
			expect(result.Item).toBeUndefined()

			const existing = await client.send(
				new GetItemCommand({
					TableName: 'Accounts',
					Key: { id: { S: 'existing' } },
				})
			)
			expect(existing.Item?.balance?.N).toBe('100')
		})

		it('should reject multiple operations on the same item', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'Accounts',
					Item: {
						id: { S: 'duplicate' },
						balance: { N: '100' },
					},
				})
			)

			try {
				await client.send(
					new TransactWriteItemsCommand({
						TransactItems: [
							{
								Update: {
									TableName: 'Accounts',
									Key: { id: { S: 'duplicate' } },
									UpdateExpression: 'SET balance = balance + :amount',
									ExpressionAttributeValues: {
										':amount': { N: '50' },
									},
								},
							},
							{
								Update: {
									TableName: 'Accounts',
									Key: { id: { S: 'duplicate' } },
									UpdateExpression: 'SET balance = balance - :amount',
									ExpressionAttributeValues: {
										':amount': { N: '25' },
									},
								},
							},
						],
					})
				)
				expect(true).toBe(false)
			} catch (error: any) {
				expect(error.name).toBe('ValidationException')
				expect(error.message).toContain('multiple operations on one item')
			}

			const result = await client.send(
				new GetItemCommand({
					TableName: 'Accounts',
					Key: { id: { S: 'duplicate' } },
				})
			)
			expect(result.Item?.balance?.N).toBe('100')
		})

		it('should support condition checks', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'Accounts',
					Item: {
						id: { S: 'source' },
						balance: { N: '1000' },
					},
				})
			)

			await client.send(
				new PutItemCommand({
					TableName: 'Accounts',
					Item: {
						id: { S: 'dest' },
						balance: { N: '500' },
					},
				})
			)

			await client.send(
				new PutItemCommand({
					TableName: 'Accounts',
					Item: {
						id: { S: 'audit' },
						status: { S: 'active' },
					},
				})
			)

			await client.send(
				new TransactWriteItemsCommand({
					TransactItems: [
						{
							ConditionCheck: {
								TableName: 'Accounts',
								Key: { id: { S: 'audit' } },
								ConditionExpression: '#s = :status',
								ExpressionAttributeNames: { '#s': 'status' },
								ExpressionAttributeValues: {
									':status': { S: 'active' },
								},
							},
						},
						{
							Update: {
								TableName: 'Accounts',
								Key: { id: { S: 'source' } },
								UpdateExpression: 'SET balance = balance - :amount',
								ConditionExpression: 'balance >= :amount',
								ExpressionAttributeValues: {
									':amount': { N: '100' },
								},
							},
						},
						{
							Update: {
								TableName: 'Accounts',
								Key: { id: { S: 'dest' } },
								UpdateExpression: 'SET balance = balance + :amount',
								ExpressionAttributeValues: {
									':amount': { N: '100' },
								},
							},
						},
					],
				})
			)

			const source = await client.send(
				new GetItemCommand({
					TableName: 'Accounts',
					Key: { id: { S: 'source' } },
				})
			)

			const dest = await client.send(
				new GetItemCommand({
					TableName: 'Accounts',
					Key: { id: { S: 'dest' } },
				})
			)

			expect(source.Item?.balance?.N).toBe('900')
			expect(dest.Item?.balance?.N).toBe('600')
		})
	})

	describe('TransactGetItems', () => {
		it('should get multiple items in a transaction', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'Accounts',
					Item: {
						id: { S: 'get#1' },
						name: { S: 'Account 1' },
					},
				})
			)

			await client.send(
				new PutItemCommand({
					TableName: 'Accounts',
					Item: {
						id: { S: 'get#2' },
						name: { S: 'Account 2' },
					},
				})
			)

			const result = await client.send(
				new TransactGetItemsCommand({
					TransactItems: [
						{
							Get: {
								TableName: 'Accounts',
								Key: { id: { S: 'get#1' } },
							},
						},
						{
							Get: {
								TableName: 'Accounts',
								Key: { id: { S: 'get#2' } },
							},
						},
					],
				})
			)

			expect(result.Responses?.length).toBe(2)
			expect(result.Responses?.[0]?.Item?.name?.S).toBe('Account 1')
			expect(result.Responses?.[1]?.Item?.name?.S).toBe('Account 2')
		})
	})
})
