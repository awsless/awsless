import { CreateTableCommand } from '@aws-sdk/client-dynamodb'
import { DeleteCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { DynamoDBServer } from '../src/index.js'

describe('DynamoDB Document Client', () => {
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
				TableName: 'DocTest',
				KeySchema: [
					{ AttributeName: 'pk', KeyType: 'HASH' },
					{ AttributeName: 'sk', KeyType: 'RANGE' },
				],
				AttributeDefinitions: [
					{ AttributeName: 'pk', AttributeType: 'S' },
					{ AttributeName: 'sk', AttributeType: 'S' },
				],
				BillingMode: 'PAY_PER_REQUEST',
			})
		)
	})

	it('should put and get with native JavaScript types', async () => {
		const docClient = server.getDocumentClient()

		const item = {
			pk: 'user#1',
			sk: 'profile',
			name: 'John Doe',
			age: 30,
			active: true,
			tags: ['developer', 'nodejs'],
			metadata: {
				createdAt: '2024-01-01',
				updatedAt: '2024-01-15',
			},
		}

		await docClient.send(
			new PutCommand({
				TableName: 'DocTest',
				Item: item,
			})
		)

		const result = await docClient.send(
			new GetCommand({
				TableName: 'DocTest',
				Key: {
					pk: 'user#1',
					sk: 'profile',
				},
			})
		)

		expect(result.Item).toStrictEqual(item)
	})

	it('should query with native JavaScript types', async () => {
		const docClient = server.getDocumentClient()

		for (let i = 1; i <= 3; i++) {
			await docClient.send(
				new PutCommand({
					TableName: 'DocTest',
					Item: {
						pk: 'user#1',
						sk: `post#${i}`,
						title: `Post ${i}`,
						views: i * 100,
					},
				})
			)
		}

		const result = await docClient.send(
			new QueryCommand({
				TableName: 'DocTest',
				KeyConditionExpression: 'pk = :pk',
				ExpressionAttributeValues: {
					':pk': 'user#1',
				},
			})
		)

		expect(result.Count).toBe(3)
		expect(result.Items).toStrictEqual([
			{ pk: 'user#1', sk: 'post#1', title: 'Post 1', views: 100 },
			{ pk: 'user#1', sk: 'post#2', title: 'Post 2', views: 200 },
			{ pk: 'user#1', sk: 'post#3', title: 'Post 3', views: 300 },
		])
	})

	it('should update with native JavaScript types', async () => {
		const docClient = server.getDocumentClient()

		await docClient.send(
			new PutCommand({
				TableName: 'DocTest',
				Item: {
					pk: 'user#1',
					sk: 'stats',
					count: 0,
					items: ['a'],
				},
			})
		)

		await docClient.send(
			new UpdateCommand({
				TableName: 'DocTest',
				Key: {
					pk: 'user#1',
					sk: 'stats',
				},
				UpdateExpression: 'SET #c = #c + :inc, #i = list_append(#i, :newItems)',
				ExpressionAttributeNames: {
					'#c': 'count',
					'#i': 'items',
				},
				ExpressionAttributeValues: {
					':inc': 1,
					':newItems': ['b', 'c'],
				},
			})
		)

		const result = await docClient.send(
			new GetCommand({
				TableName: 'DocTest',
				Key: {
					pk: 'user#1',
					sk: 'stats',
				},
			})
		)

		expect(result.Item).toStrictEqual({
			pk: 'user#1',
			sk: 'stats',
			count: 1,
			items: ['a', 'b', 'c'],
		})
	})

	it('should delete items', async () => {
		const docClient = server.getDocumentClient()

		await docClient.send(
			new PutCommand({
				TableName: 'DocTest',
				Item: {
					pk: 'user#1',
					sk: 'temp',
					data: 'to be deleted',
				},
			})
		)

		await docClient.send(
			new DeleteCommand({
				TableName: 'DocTest',
				Key: {
					pk: 'user#1',
					sk: 'temp',
				},
			})
		)

		const result = await docClient.send(
			new GetCommand({
				TableName: 'DocTest',
				Key: {
					pk: 'user#1',
					sk: 'temp',
				},
			})
		)

		expect(result.Item).toBeUndefined()
	})
})
