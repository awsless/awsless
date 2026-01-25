import { CreateTableCommand, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test'
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
})
