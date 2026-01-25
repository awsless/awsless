import {
	CreateTableCommand,
	DeleteItemCommand,
	DeleteTableCommand,
	DescribeTableCommand,
	GetItemCommand,
	ListTablesCommand,
	PutItemCommand,
	QueryCommand,
	ScanCommand,
	UpdateItemCommand,
} from '@aws-sdk/client-dynamodb'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { DynamoDBServer } from '../src/index.js'

describe('DynamoDB Local Server', () => {
	let server: DynamoDBServer

	beforeAll(async () => {
		server = new DynamoDBServer()
		await server.listen()
	})

	afterAll(async () => {
		await server.stop()
	})

	beforeEach(() => {
		server.reset()
	})

	describe('Table Operations', () => {
		it('should create a table', async () => {
			const client = server.getClient()

			const result = await client.send(
				new CreateTableCommand({
					TableName: 'TestTable',
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

			expect(result.TableDescription?.TableName).toBe('TestTable')
			expect(result.TableDescription?.TableStatus).toBe('ACTIVE')
		})

		it('should list tables', async () => {
			const client = server.getClient()

			await client.send(
				new CreateTableCommand({
					TableName: 'Table1',
					KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
					AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
					BillingMode: 'PAY_PER_REQUEST',
				})
			)

			await client.send(
				new CreateTableCommand({
					TableName: 'Table2',
					KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
					AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
					BillingMode: 'PAY_PER_REQUEST',
				})
			)

			const result = await client.send(new ListTablesCommand({}))

			expect(result.TableNames).toContain('Table1')
			expect(result.TableNames).toContain('Table2')
		})

		it('should describe a table', async () => {
			const client = server.getClient()

			await client.send(
				new CreateTableCommand({
					TableName: 'DescribeTest',
					KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
					AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
					BillingMode: 'PAY_PER_REQUEST',
				})
			)

			const result = await client.send(new DescribeTableCommand({ TableName: 'DescribeTest' }))

			expect(result.Table?.TableName).toBe('DescribeTest')
			expect(result.Table?.TableStatus).toBe('ACTIVE')
		})

		it('should delete a table', async () => {
			const client = server.getClient()

			await client.send(
				new CreateTableCommand({
					TableName: 'ToDelete',
					KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
					AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
					BillingMode: 'PAY_PER_REQUEST',
				})
			)

			const result = await client.send(new DeleteTableCommand({ TableName: 'ToDelete' }))

			expect(result.TableDescription?.TableName).toBe('ToDelete')

			const listResult = await client.send(new ListTablesCommand({}))
			expect(listResult.TableNames).not.toContain('ToDelete')
		})
	})

	describe('Item Operations', () => {
		beforeEach(async () => {
			const client = server.getClient()
			await client.send(
				new CreateTableCommand({
					TableName: 'Items',
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

		it('should put and get an item', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'Items',
					Item: {
						pk: { S: 'user#1' },
						sk: { S: 'profile' },
						name: { S: 'John Doe' },
						age: { N: '30' },
					},
				})
			)

			const result = await client.send(
				new GetItemCommand({
					TableName: 'Items',
					Key: {
						pk: { S: 'user#1' },
						sk: { S: 'profile' },
					},
				})
			)

			expect(result.Item?.name?.S).toBe('John Doe')
			expect(result.Item?.age?.N).toBe('30')
		})

		it('should delete an item', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'Items',
					Item: {
						pk: { S: 'user#2' },
						sk: { S: 'profile' },
						name: { S: 'Jane Doe' },
					},
				})
			)

			await client.send(
				new DeleteItemCommand({
					TableName: 'Items',
					Key: {
						pk: { S: 'user#2' },
						sk: { S: 'profile' },
					},
				})
			)

			const result = await client.send(
				new GetItemCommand({
					TableName: 'Items',
					Key: {
						pk: { S: 'user#2' },
						sk: { S: 'profile' },
					},
				})
			)

			expect(result.Item).toBeUndefined()
		})

		it('should update an item', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'Items',
					Item: {
						pk: { S: 'user#3' },
						sk: { S: 'profile' },
						name: { S: 'Bob' },
						views: { N: '0' },
					},
				})
			)

			await client.send(
				new UpdateItemCommand({
					TableName: 'Items',
					Key: {
						pk: { S: 'user#3' },
						sk: { S: 'profile' },
					},
					UpdateExpression: 'SET #n = :name ADD #v :inc',
					ExpressionAttributeNames: {
						'#n': 'name',
						'#v': 'views',
					},
					ExpressionAttributeValues: {
						':name': { S: 'Robert' },
						':inc': { N: '1' },
					},
				})
			)

			const result = await client.send(
				new GetItemCommand({
					TableName: 'Items',
					Key: {
						pk: { S: 'user#3' },
						sk: { S: 'profile' },
					},
				})
			)

			expect(result.Item?.name?.S).toBe('Robert')
			expect(result.Item?.views?.N).toBe('1')
		})

		it('should fail condition expression', async () => {
			const client = server.getClient()

			await client.send(
				new PutItemCommand({
					TableName: 'Items',
					Item: {
						pk: { S: 'user#4' },
						sk: { S: 'profile' },
						name: { S: 'Alice' },
					},
				})
			)

			try {
				await client.send(
					new PutItemCommand({
						TableName: 'Items',
						Item: {
							pk: { S: 'user#4' },
							sk: { S: 'profile' },
							name: { S: 'New Alice' },
						},
						ConditionExpression: 'attribute_not_exists(pk)',
					})
				)
				expect(true).toBe(false)
			} catch (error: any) {
				expect(error.name).toBe('ConditionalCheckFailedException')
			}
		})
	})

	describe('Query Operations', () => {
		beforeEach(async () => {
			const client = server.getClient()
			await client.send(
				new CreateTableCommand({
					TableName: 'QueryTest',
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

			for (let i = 1; i <= 5; i++) {
				await client.send(
					new PutItemCommand({
						TableName: 'QueryTest',
						Item: {
							pk: { S: 'user#1' },
							sk: { S: `post#${i}` },
							title: { S: `Post ${i}` },
						},
					})
				)
			}
		})

		it('should query items by hash key', async () => {
			const client = server.getClient()

			const result = await client.send(
				new QueryCommand({
					TableName: 'QueryTest',
					KeyConditionExpression: 'pk = :pk',
					ExpressionAttributeValues: {
						':pk': { S: 'user#1' },
					},
				})
			)

			expect(result.Count).toBe(5)
			expect(result.Items?.length).toBe(5)
		})

		it('should query items with begins_with', async () => {
			const client = server.getClient()

			const result = await client.send(
				new QueryCommand({
					TableName: 'QueryTest',
					KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
					ExpressionAttributeValues: {
						':pk': { S: 'user#1' },
						':prefix': { S: 'post#' },
					},
				})
			)

			expect(result.Count).toBe(5)
		})

		it('should query items with filter', async () => {
			const client = server.getClient()

			const result = await client.send(
				new QueryCommand({
					TableName: 'QueryTest',
					KeyConditionExpression: 'pk = :pk',
					FilterExpression: 'title = :title',
					ExpressionAttributeValues: {
						':pk': { S: 'user#1' },
						':title': { S: 'Post 3' },
					},
				})
			)

			expect(result.Count).toBe(1)
			expect(result.Items?.[0]?.title?.S).toBe('Post 3')
		})
	})

	describe('Scan Operations', () => {
		beforeEach(async () => {
			const client = server.getClient()
			await client.send(
				new CreateTableCommand({
					TableName: 'ScanTest',
					KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
					AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
					BillingMode: 'PAY_PER_REQUEST',
				})
			)

			for (let i = 1; i <= 10; i++) {
				await client.send(
					new PutItemCommand({
						TableName: 'ScanTest',
						Item: {
							id: { S: `item#${i}` },
							value: { N: `${i}` },
						},
					})
				)
			}
		})

		it('should scan all items', async () => {
			const client = server.getClient()

			const result = await client.send(
				new ScanCommand({
					TableName: 'ScanTest',
				})
			)

			expect(result.Count).toBe(10)
		})

		it('should scan with filter', async () => {
			const client = server.getClient()

			const result = await client.send(
				new ScanCommand({
					TableName: 'ScanTest',
					FilterExpression: '#v > :val',
					ExpressionAttributeNames: {
						'#v': 'value',
					},
					ExpressionAttributeValues: {
						':val': { N: '5' },
					},
				})
			)

			expect(result.Count).toBe(5)
		})
	})
})
