import { CreateTableCommand, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { DynamoDBServer } from '../src/index.js'

describe('Key Condition Expressions', () => {
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

	it('should handle parentheses around individual conditions', async () => {
		const client = server.getClient()

		await client.send(
			new CreateTableCommand({
				TableName: 'ParenTest',
				KeySchema: [
					{ AttributeName: 'pk', KeyType: 'HASH' },
					{ AttributeName: 'sk', KeyType: 'RANGE' },
				],
				AttributeDefinitions: [
					{ AttributeName: 'pk', AttributeType: 'N' },
					{ AttributeName: 'sk', AttributeType: 'N' },
				],
				BillingMode: 'PAY_PER_REQUEST',
			})
		)

		await client.send(
			new PutItemCommand({
				TableName: 'ParenTest',
				Item: { pk: { N: '1' }, sk: { N: '1' }, value: { S: 'test' } },
			})
		)

		// Query with parentheses around each condition: (#n1 = :v1) AND (#n2 = :v2)
		const result = await client.send(
			new QueryCommand({
				TableName: 'ParenTest',
				KeyConditionExpression: '(#pk = :pk) AND (#sk = :sk)',
				ExpressionAttributeNames: {
					'#pk': 'pk',
					'#sk': 'sk',
				},
				ExpressionAttributeValues: {
					':pk': { N: '1' },
					':sk': { N: '1' },
				},
			})
		)

		expect(result.Count).toBe(1)
		expect(result.Items?.[0]?.value?.S).toBe('test')
	})

	it('should handle parentheses around the entire expression', async () => {
		const client = server.getClient()

		await client.send(
			new CreateTableCommand({
				TableName: 'ParenTest2',
				KeySchema: [
					{ AttributeName: 'pk', KeyType: 'HASH' },
					{ AttributeName: 'sk', KeyType: 'RANGE' },
				],
				AttributeDefinitions: [
					{ AttributeName: 'pk', AttributeType: 'N' },
					{ AttributeName: 'sk', AttributeType: 'N' },
				],
				BillingMode: 'PAY_PER_REQUEST',
			})
		)

		await client.send(
			new PutItemCommand({
				TableName: 'ParenTest2',
				Item: { pk: { N: '1' }, sk: { N: '1' }, value: { S: 'test' } },
			})
		)

		// Query with parentheses around entire expression: ((#pk = :pk) AND (#sk = :sk))
		const result = await client.send(
			new QueryCommand({
				TableName: 'ParenTest2',
				KeyConditionExpression: '((#pk = :pk) AND (#sk = :sk))',
				ExpressionAttributeNames: {
					'#pk': 'pk',
					'#sk': 'sk',
				},
				ExpressionAttributeValues: {
					':pk': { N: '1' },
					':sk': { N: '1' },
				},
			})
		)

		expect(result.Count).toBe(1)
		expect(result.Items?.[0]?.value?.S).toBe('test')
	})

	it('should handle single condition with parentheses', async () => {
		const client = server.getClient()

		await client.send(
			new CreateTableCommand({
				TableName: 'ParenTest3',
				KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
				AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'N' }],
				BillingMode: 'PAY_PER_REQUEST',
			})
		)

		await client.send(
			new PutItemCommand({
				TableName: 'ParenTest3',
				Item: { pk: { N: '1' }, value: { S: 'test' } },
			})
		)

		// Query with parentheses around single condition: (#pk = :pk)
		const result = await client.send(
			new QueryCommand({
				TableName: 'ParenTest3',
				KeyConditionExpression: '(#pk = :pk)',
				ExpressionAttributeNames: {
					'#pk': 'pk',
				},
				ExpressionAttributeValues: {
					':pk': { N: '1' },
				},
			})
		)

		expect(result.Count).toBe(1)
		expect(result.Items?.[0]?.value?.S).toBe('test')
	})

	it('should support BETWEEN without breaking AND parsing', async () => {
		const client = server.getClient()

		await client.send(
			new CreateTableCommand({
				TableName: 'BetweenTest',
				KeySchema: [
					{ AttributeName: 'pk', KeyType: 'HASH' },
					{ AttributeName: 'sk', KeyType: 'RANGE' },
				],
				AttributeDefinitions: [
					{ AttributeName: 'pk', AttributeType: 'S' },
					{ AttributeName: 'sk', AttributeType: 'N' },
				],
				BillingMode: 'PAY_PER_REQUEST',
			})
		)

		for (const value of ['1', '2', '3']) {
			await client.send(
				new PutItemCommand({
					TableName: 'BetweenTest',
					Item: { pk: { S: 'group#1' }, sk: { N: value } },
				})
			)
		}

		const result = await client.send(
			new QueryCommand({
				TableName: 'BetweenTest',
				KeyConditionExpression: 'pk = :pk AND sk BETWEEN :from AND :to',
				ExpressionAttributeValues: {
					':pk': { S: 'group#1' },
					':from': { N: '2' },
					':to': { N: '3' },
				},
			})
		)

		expect(result.Count).toBe(2)
	})

	it('should support grouped multi-sort-key conditions', async () => {
		const client = server.getClient()

		await client.send(
			new CreateTableCommand({
				TableName: 'GroupedMultiSortKeyTest',
				KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
				AttributeDefinitions: [
					{ AttributeName: 'pk', AttributeType: 'S' },
					{ AttributeName: 'tenant', AttributeType: 'S' },
					{ AttributeName: 'slug', AttributeType: 'S' },
					{ AttributeName: 'createdAt', AttributeType: 'N' },
				],
				GlobalSecondaryIndexes: [
					{
						IndexName: 'GSI1',
						KeySchema: [
							{ AttributeName: 'tenant', KeyType: 'HASH' },
							{ AttributeName: 'slug', KeyType: 'RANGE' },
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
				TableName: 'GroupedMultiSortKeyTest',
				Item: {
					pk: { S: '1' },
					tenant: { S: 'tenant#1' },
					slug: { S: 'post-a' },
					createdAt: { N: '100' },
				},
			})
		)

		await client.send(
			new PutItemCommand({
				TableName: 'GroupedMultiSortKeyTest',
				Item: {
					pk: { S: '2' },
					tenant: { S: 'tenant#1' },
					slug: { S: 'post-a' },
					createdAt: { N: '200' },
				},
			})
		)

		const result = await client.send(
			new QueryCommand({
				TableName: 'GroupedMultiSortKeyTest',
				IndexName: 'GSI1',
				KeyConditionExpression: '#tenant = :tenant AND (#slug = :slug AND #createdAt > :createdAt)',
				ExpressionAttributeNames: {
					'#tenant': 'tenant',
					'#slug': 'slug',
					'#createdAt': 'createdAt',
				},
				ExpressionAttributeValues: {
					':tenant': { S: 'tenant#1' },
					':slug': { S: 'post-a' },
					':createdAt': { N: '150' },
				},
			})
		)

		expect(result.Count).toBe(1)
		expect(result.Items?.[0]?.pk?.S).toBe('2')
	})
})
