import {
	BatchGetItemCommand,
	BatchWriteItemCommand,
	CreateTableCommand,
	GetItemCommand,
	PutItemCommand,
} from '@aws-sdk/client-dynamodb'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { DynamoDBServer } from '../src/index.js'

describe('Batch Operations', () => {
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
				TableName: 'BatchTest',
				KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
				AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
				BillingMode: 'PAY_PER_REQUEST',
			})
		)
	})

	describe('BatchWriteItem', () => {
		it('should write multiple items', async () => {
			const client = server.getClient()

			await client.send(
				new BatchWriteItemCommand({
					RequestItems: {
						BatchTest: [
							{ PutRequest: { Item: { id: { S: 'batch#1' }, value: { N: '1' } } } },
							{ PutRequest: { Item: { id: { S: 'batch#2' }, value: { N: '2' } } } },
							{ PutRequest: { Item: { id: { S: 'batch#3' }, value: { N: '3' } } } },
						],
					},
				})
			)

			const result1 = await client.send(
				new GetItemCommand({ TableName: 'BatchTest', Key: { id: { S: 'batch#1' } } })
			)
			const result2 = await client.send(
				new GetItemCommand({ TableName: 'BatchTest', Key: { id: { S: 'batch#2' } } })
			)
			const result3 = await client.send(
				new GetItemCommand({ TableName: 'BatchTest', Key: { id: { S: 'batch#3' } } })
			)

			expect(result1.Item?.value?.N).toBe('1')
			expect(result2.Item?.value?.N).toBe('2')
			expect(result3.Item?.value?.N).toBe('3')
		})

		it('should delete multiple items', async () => {
			const client = server.getClient()

			for (let i = 1; i <= 3; i++) {
				await client.send(
					new PutItemCommand({
						TableName: 'BatchTest',
						Item: { id: { S: `delete#${i}` }, value: { N: `${i}` } },
					})
				)
			}

			await client.send(
				new BatchWriteItemCommand({
					RequestItems: {
						BatchTest: [
							{ DeleteRequest: { Key: { id: { S: 'delete#1' } } } },
							{ DeleteRequest: { Key: { id: { S: 'delete#2' } } } },
						],
					},
				})
			)

			const result1 = await client.send(
				new GetItemCommand({ TableName: 'BatchTest', Key: { id: { S: 'delete#1' } } })
			)
			const result2 = await client.send(
				new GetItemCommand({ TableName: 'BatchTest', Key: { id: { S: 'delete#2' } } })
			)
			const result3 = await client.send(
				new GetItemCommand({ TableName: 'BatchTest', Key: { id: { S: 'delete#3' } } })
			)

			expect(result1.Item).toBeUndefined()
			expect(result2.Item).toBeUndefined()
			expect(result3.Item?.value?.N).toBe('3')
		})
	})

	describe('BatchGetItem', () => {
		it('should get multiple items', async () => {
			const client = server.getClient()

			for (let i = 1; i <= 5; i++) {
				await client.send(
					new PutItemCommand({
						TableName: 'BatchTest',
						Item: { id: { S: `get#${i}` }, name: { S: `Item ${i}` } },
					})
				)
			}

			const result = await client.send(
				new BatchGetItemCommand({
					RequestItems: {
						BatchTest: {
							Keys: [{ id: { S: 'get#1' } }, { id: { S: 'get#3' } }, { id: { S: 'get#5' } }],
						},
					},
				})
			)

			expect(result.Responses?.BatchTest?.length).toBe(3)
		})

		it('should handle missing items', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'BatchTest',
					Item: { id: { S: 'exists' }, name: { S: 'Exists' } },
				})
			)

			const result = await client.send(
				new BatchGetItemCommand({
					RequestItems: {
						BatchTest: {
							Keys: [{ id: { S: 'exists' } }, { id: { S: 'not-exists' } }],
						},
					},
				})
			)

			expect(result.Responses?.BatchTest?.length).toBe(1)
			expect(result.Responses?.BatchTest?.[0]?.name?.S).toBe('Exists')
		})
	})
})
