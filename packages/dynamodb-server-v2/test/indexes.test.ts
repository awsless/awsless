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

		it('should query a multi-key GSI with multiple partition keys', async () => {
			const client = server.getClient()

			await client.send(
				new CreateTableCommand({
					TableName: 'MultiKeyGSITest',
					KeySchema: [
						{ AttributeName: 'pk', KeyType: 'HASH' },
						{ AttributeName: 'sk', KeyType: 'RANGE' },
					],
					AttributeDefinitions: [
						{ AttributeName: 'pk', AttributeType: 'S' },
						{ AttributeName: 'sk', AttributeType: 'S' },
						{ AttributeName: 'tenant', AttributeType: 'S' },
						{ AttributeName: 'region', AttributeType: 'S' },
						{ AttributeName: 'entityType', AttributeType: 'S' },
						{ AttributeName: 'status', AttributeType: 'S' },
						{ AttributeName: 'createdAt', AttributeType: 'N' },
					],
					GlobalSecondaryIndexes: [
						{
							IndexName: 'GSI1',
							KeySchema: [
								{ AttributeName: 'tenant', KeyType: 'HASH' },
								{ AttributeName: 'region', KeyType: 'HASH' },
								{ AttributeName: 'entityType', KeyType: 'HASH' },
								{ AttributeName: 'status', KeyType: 'RANGE' },
								{ AttributeName: 'createdAt', KeyType: 'RANGE' },
							],
							Projection: { ProjectionType: 'ALL' },
						},
					],
					BillingMode: 'PAY_PER_REQUEST',
				})
			)

			await client.send(
				new PutItemCommand({
					TableName: 'MultiKeyGSITest',
					Item: {
						pk: { S: 'user#1' },
						sk: { S: 'profile' },
						tenant: { S: 'tenant#1' },
						region: { S: 'eu-west-1' },
						entityType: { S: 'user' },
						status: { S: 'active' },
						createdAt: { N: '100' },
					},
				})
			)

			await client.send(
				new PutItemCommand({
					TableName: 'MultiKeyGSITest',
					Item: {
						pk: { S: 'user#2' },
						sk: { S: 'profile' },
						tenant: { S: 'tenant#1' },
						region: { S: 'eu-west-1' },
						entityType: { S: 'user' },
						status: { S: 'active' },
						createdAt: { N: '200' },
					},
				})
			)

			await client.send(
				new PutItemCommand({
					TableName: 'MultiKeyGSITest',
					Item: {
						pk: { S: 'user#3' },
						sk: { S: 'profile' },
						tenant: { S: 'tenant#1' },
						region: { S: 'eu-west-1' },
						entityType: { S: 'user' },
						status: { S: 'disabled' },
						createdAt: { N: '300' },
					},
				})
			)

			const result = await client.send(
				new QueryCommand({
					TableName: 'MultiKeyGSITest',
					IndexName: 'GSI1',
					KeyConditionExpression:
						'tenant = :tenant AND region = :region AND entityType = :entityType AND status = :status AND createdAt >= :createdAt',
					ExpressionAttributeValues: {
						':tenant': { S: 'tenant#1' },
						':region': { S: 'eu-west-1' },
						':entityType': { S: 'user' },
						':status': { S: 'active' },
						':createdAt': { N: '150' },
					},
				})
			)

			expect(result.Count).toBe(1)
			expect(result.Items?.[0]?.pk?.S).toBe('user#2')
		})

		it('should keep a multi-key GSI sparse until all key attributes exist', async () => {
			const client = server.getClient()

			await client.send(
				new CreateTableCommand({
					TableName: 'SparseMultiKeyGSITest',
					KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
					AttributeDefinitions: [
						{ AttributeName: 'pk', AttributeType: 'S' },
						{ AttributeName: 'tenant', AttributeType: 'S' },
						{ AttributeName: 'region', AttributeType: 'S' },
						{ AttributeName: 'kind', AttributeType: 'S' },
					],
					GlobalSecondaryIndexes: [
						{
							IndexName: 'GSI1',
							KeySchema: [
								{ AttributeName: 'tenant', KeyType: 'HASH' },
								{ AttributeName: 'region', KeyType: 'HASH' },
								{ AttributeName: 'kind', KeyType: 'RANGE' },
							],
							Projection: { ProjectionType: 'ALL' },
						},
					],
					BillingMode: 'PAY_PER_REQUEST',
				})
			)

			await client.send(
				new PutItemCommand({
					TableName: 'SparseMultiKeyGSITest',
					Item: {
						pk: { S: 'item#1' },
						tenant: { S: 'tenant#1' },
						region: { S: 'eu-west-1' },
					},
				})
			)

			await client.send(
				new PutItemCommand({
					TableName: 'SparseMultiKeyGSITest',
					Item: {
						pk: { S: 'item#2' },
						tenant: { S: 'tenant#1' },
						region: { S: 'eu-west-1' },
						kind: { S: 'user' },
					},
				})
			)

			const result = await client.send(
				new ScanCommand({
					TableName: 'SparseMultiKeyGSITest',
					IndexName: 'GSI1',
				})
			)

			expect(result.Count).toBe(1)
			expect(result.Items?.[0]?.pk?.S).toBe('item#2')
		})

		it('should query a multi-key GSI using multiple partition keys only', async () => {
			const client = server.getClient()

			await client.send(
				new CreateTableCommand({
					TableName: 'MultiHashOnlyGSITest',
					KeySchema: [
						{ AttributeName: 'pk', KeyType: 'HASH' },
						{ AttributeName: 'sk', KeyType: 'RANGE' },
					],
					AttributeDefinitions: [
						{ AttributeName: 'pk', AttributeType: 'S' },
						{ AttributeName: 'sk', AttributeType: 'S' },
						{ AttributeName: 'tenant', AttributeType: 'S' },
						{ AttributeName: 'region', AttributeType: 'S' },
						{ AttributeName: 'kind', AttributeType: 'S' },
					],
					GlobalSecondaryIndexes: [
						{
							IndexName: 'GSI1',
							KeySchema: [
								{ AttributeName: 'tenant', KeyType: 'HASH' },
								{ AttributeName: 'region', KeyType: 'HASH' },
								{ AttributeName: 'kind', KeyType: 'RANGE' },
							],
							Projection: { ProjectionType: 'ALL' },
						},
					],
					BillingMode: 'PAY_PER_REQUEST',
				})
			)

			const items = [
				{ pk: 'user#1', tenant: 'tenant#1', region: 'eu-west-1', kind: 'account' },
				{ pk: 'user#2', tenant: 'tenant#1', region: 'eu-west-1', kind: 'profile' },
				{ pk: 'user#3', tenant: 'tenant#1', region: 'us-east-1', kind: 'account' },
				{ pk: 'user#4', tenant: 'tenant#2', region: 'eu-west-1', kind: 'account' },
			]

			for (const item of items) {
				await client.send(
					new PutItemCommand({
						TableName: 'MultiHashOnlyGSITest',
						Item: {
							pk: { S: item.pk },
							sk: { S: 'root' },
							tenant: { S: item.tenant },
							region: { S: item.region },
							kind: { S: item.kind },
						},
					})
				)
			}

			const result = await client.send(
				new QueryCommand({
					TableName: 'MultiHashOnlyGSITest',
					IndexName: 'GSI1',
					KeyConditionExpression: 'tenant = :tenant AND region = :region',
					ExpressionAttributeValues: {
						':tenant': { S: 'tenant#1' },
						':region': { S: 'eu-west-1' },
					},
				})
			)

			expect(result.Count).toBe(2)
			expect(result.Items?.map(item => item.pk?.S)).toEqual(['user#1', 'user#2'])
		})

		it('should query a multi-key GSI using multiple sort keys in order', async () => {
			const client = server.getClient()

			await client.send(
				new CreateTableCommand({
					TableName: 'MultiSortGSITest',
					KeySchema: [
						{ AttributeName: 'pk', KeyType: 'HASH' },
						{ AttributeName: 'sk', KeyType: 'RANGE' },
					],
					AttributeDefinitions: [
						{ AttributeName: 'pk', AttributeType: 'S' },
						{ AttributeName: 'sk', AttributeType: 'S' },
						{ AttributeName: 'tenant', AttributeType: 'S' },
						{ AttributeName: 'region', AttributeType: 'S' },
						{ AttributeName: 'status', AttributeType: 'S' },
						{ AttributeName: 'category', AttributeType: 'S' },
						{ AttributeName: 'createdAt', AttributeType: 'N' },
					],
					GlobalSecondaryIndexes: [
						{
							IndexName: 'GSI1',
							KeySchema: [
								{ AttributeName: 'tenant', KeyType: 'HASH' },
								{ AttributeName: 'region', KeyType: 'HASH' },
								{ AttributeName: 'status', KeyType: 'RANGE' },
								{ AttributeName: 'category', KeyType: 'RANGE' },
								{ AttributeName: 'createdAt', KeyType: 'RANGE' },
							],
							Projection: { ProjectionType: 'ALL' },
						},
					],
					BillingMode: 'PAY_PER_REQUEST',
				})
			)

			const items = [
				{ pk: 'order#1', status: 'active', category: 'pro', createdAt: '100' },
				{ pk: 'order#2', status: 'active', category: 'pro', createdAt: '200' },
				{ pk: 'order#3', status: 'active', category: 'basic', createdAt: '300' },
				{ pk: 'order#4', status: 'disabled', category: 'pro', createdAt: '400' },
			]

			for (const item of items) {
				await client.send(
					new PutItemCommand({
						TableName: 'MultiSortGSITest',
						Item: {
							pk: { S: item.pk },
							sk: { S: 'root' },
							tenant: { S: 'tenant#1' },
							region: { S: 'eu-west-1' },
							status: { S: item.status },
							category: { S: item.category },
							createdAt: { N: item.createdAt },
						},
					})
				)
			}

			const result = await client.send(
				new QueryCommand({
					TableName: 'MultiSortGSITest',
					IndexName: 'GSI1',
					KeyConditionExpression:
						'tenant = :tenant AND region = :region AND status = :status AND category = :category AND createdAt BETWEEN :from AND :to',
					ExpressionAttributeValues: {
						':tenant': { S: 'tenant#1' },
						':region': { S: 'eu-west-1' },
						':status': { S: 'active' },
						':category': { S: 'pro' },
						':from': { N: '150' },
						':to': { N: '250' },
					},
				})
			)

			expect(result.Count).toBe(1)
			expect(result.Items?.[0]?.pk?.S).toBe('order#2')
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
