import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test'
import { CreateTableCommand, PutItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb'
import { DynamoDBServer } from '../src/index.js'

describe('Secondary Indexes', () => {
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

	describe('Global Secondary Index', () => {
		beforeEach(async () => {
			const client = server.getClient()
			await client.send(
				new CreateTableCommand({
					TableName: 'GSITest',
					KeySchema: [
						{ AttributeName: 'pk', KeyType: 'HASH' },
						{ AttributeName: 'sk', KeyType: 'RANGE' },
					],
					AttributeDefinitions: [
						{ AttributeName: 'pk', AttributeType: 'S' },
						{ AttributeName: 'sk', AttributeType: 'S' },
						{ AttributeName: 'gsiPk', AttributeType: 'S' },
						{ AttributeName: 'gsiSk', AttributeType: 'S' },
					],
					GlobalSecondaryIndexes: [
						{
							IndexName: 'GSI1',
							KeySchema: [
								{ AttributeName: 'gsiPk', KeyType: 'HASH' },
								{ AttributeName: 'gsiSk', KeyType: 'RANGE' },
							],
							Projection: { ProjectionType: 'ALL' },
						},
					],
					BillingMode: 'PAY_PER_REQUEST',
				})
			)

			for (let i = 1; i <= 5; i++) {
				await client.send(
					new PutItemCommand({
						TableName: 'GSITest',
						Item: {
							pk: { S: `user#${i}` },
							sk: { S: 'profile' },
							gsiPk: { S: 'type#user' },
							gsiSk: { S: `created#${i}` },
							name: { S: `User ${i}` },
						},
					})
				)
			}
		})

		it('should query GSI', async () => {
			const client = server.getClient()

			const result = await client.send(
				new QueryCommand({
					TableName: 'GSITest',
					IndexName: 'GSI1',
					KeyConditionExpression: 'gsiPk = :pk',
					ExpressionAttributeValues: {
						':pk': { S: 'type#user' },
					},
				})
			)

			expect(result.Count).toBe(5)
		})

		it('should query GSI with sort key condition', async () => {
			const client = server.getClient()

			const result = await client.send(
				new QueryCommand({
					TableName: 'GSITest',
					IndexName: 'GSI1',
					KeyConditionExpression: 'gsiPk = :pk AND gsiSk > :sk',
					ExpressionAttributeValues: {
						':pk': { S: 'type#user' },
						':sk': { S: 'created#3' },
					},
				})
			)

			expect(result.Count).toBe(2)
		})

		it('should scan GSI', async () => {
			const client = server.getClient()

			const result = await client.send(
				new ScanCommand({
					TableName: 'GSITest',
					IndexName: 'GSI1',
				})
			)

			expect(result.Count).toBe(5)
		})
	})

	describe('Local Secondary Index', () => {
		beforeEach(async () => {
			const client = server.getClient()
			await client.send(
				new CreateTableCommand({
					TableName: 'LSITest',
					KeySchema: [
						{ AttributeName: 'pk', KeyType: 'HASH' },
						{ AttributeName: 'sk', KeyType: 'RANGE' },
					],
					AttributeDefinitions: [
						{ AttributeName: 'pk', AttributeType: 'S' },
						{ AttributeName: 'sk', AttributeType: 'S' },
						{ AttributeName: 'lsiSk', AttributeType: 'N' },
					],
					LocalSecondaryIndexes: [
						{
							IndexName: 'LSI1',
							KeySchema: [
								{ AttributeName: 'pk', KeyType: 'HASH' },
								{ AttributeName: 'lsiSk', KeyType: 'RANGE' },
							],
							Projection: { ProjectionType: 'ALL' },
						},
					],
					BillingMode: 'PAY_PER_REQUEST',
				})
			)

			for (let i = 1; i <= 5; i++) {
				await client.send(
					new PutItemCommand({
						TableName: 'LSITest',
						Item: {
							pk: { S: 'user#1' },
							sk: { S: `post#${i}` },
							lsiSk: { N: `${i * 10}` },
							title: { S: `Post ${i}` },
						},
					})
				)
			}
		})

		it('should query LSI', async () => {
			const client = server.getClient()

			const result = await client.send(
				new QueryCommand({
					TableName: 'LSITest',
					IndexName: 'LSI1',
					KeyConditionExpression: 'pk = :pk',
					ExpressionAttributeValues: {
						':pk': { S: 'user#1' },
					},
				})
			)

			expect(result.Count).toBe(5)
		})

		it('should query LSI with range condition', async () => {
			const client = server.getClient()

			const result = await client.send(
				new QueryCommand({
					TableName: 'LSITest',
					IndexName: 'LSI1',
					KeyConditionExpression: 'pk = :pk AND lsiSk >= :sk',
					ExpressionAttributeValues: {
						':pk': { S: 'user#1' },
						':sk': { N: '30' },
					},
				})
			)

			expect(result.Count).toBe(3)
		})
	})
})
