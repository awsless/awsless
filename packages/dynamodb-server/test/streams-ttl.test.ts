import { CreateTableCommand, GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { DynamoDBServer, type AttributeValue, type StreamRecord } from '../src/index.js'

function getStringValue(attr: AttributeValue | undefined): string | undefined {
	if (attr && 'S' in attr) {
		return attr.S
	}
	return undefined
}

describe('Streams and TTL', () => {
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

	describe('DynamoDB Streams', () => {
		it('should emit stream records on insert', async () => {
			const client = server.getClient()

			await client.send(
				new CreateTableCommand({
					TableName: 'StreamTest',
					KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
					AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
					BillingMode: 'PAY_PER_REQUEST',
					StreamSpecification: {
						StreamEnabled: true,
						StreamViewType: 'NEW_AND_OLD_IMAGES',
					},
				})
			)

			const records: StreamRecord[] = []
			const unsubscribe = server.onStreamRecord('StreamTest', record => {
				records.push(record)
			})

			await client.send(
				new PutItemCommand({
					TableName: 'StreamTest',
					Item: {
						id: { S: 'stream#1' },
						name: { S: 'Test' },
					},
				})
			)

			expect(records.length).toBe(1)
			expect(records[0]?.eventName).toBe('INSERT')
			expect(getStringValue(records[0]?.dynamodb.NewImage?.name)).toBe('Test')
			expect(records[0]?.dynamodb.OldImage).toBeUndefined()

			unsubscribe()
		})

		it('should emit stream records on modify', async () => {
			const client = server.getClient()

			await client.send(
				new CreateTableCommand({
					TableName: 'StreamModify',
					KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
					AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
					BillingMode: 'PAY_PER_REQUEST',
					StreamSpecification: {
						StreamEnabled: true,
						StreamViewType: 'NEW_AND_OLD_IMAGES',
					},
				})
			)

			await client.send(
				new PutItemCommand({
					TableName: 'StreamModify',
					Item: {
						id: { S: 'modify#1' },
						name: { S: 'Original' },
					},
				})
			)

			const records: StreamRecord[] = []
			const unsubscribe = server.onStreamRecord('StreamModify', record => {
				records.push(record)
			})

			await client.send(
				new UpdateItemCommand({
					TableName: 'StreamModify',
					Key: { id: { S: 'modify#1' } },
					UpdateExpression: 'SET #n = :name',
					ExpressionAttributeNames: { '#n': 'name' },
					ExpressionAttributeValues: { ':name': { S: 'Updated' } },
				})
			)

			expect(records.length).toBe(1)
			expect(records[0]?.eventName).toBe('MODIFY')
			expect(getStringValue(records[0]?.dynamodb.OldImage?.name)).toBe('Original')
			expect(getStringValue(records[0]?.dynamodb.NewImage?.name)).toBe('Updated')

			unsubscribe()
		})
	})

	describe('TTL with Virtual Clock', () => {
		it('should expire items when time advances', async () => {
			const client = server.getClient()

			await client.send(
				new CreateTableCommand({
					TableName: 'TTLTest',
					KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
					AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
					BillingMode: 'PAY_PER_REQUEST',
				})
			)

			const store = server.getTableStore()
			const table = store.getTable('TTLTest')
			table.setTtlSpecification({ AttributeName: 'ttl', Enabled: true })

			const nowSeconds = Math.floor(Date.now() / 1000)

			await client.send(
				new PutItemCommand({
					TableName: 'TTLTest',
					Item: {
						id: { S: 'expires-soon' },
						ttl: { N: String(nowSeconds + 60) },
					},
				})
			)

			await client.send(
				new PutItemCommand({
					TableName: 'TTLTest',
					Item: {
						id: { S: 'expires-later' },
						ttl: { N: String(nowSeconds + 3600) },
					},
				})
			)

			let result = await client.send(
				new GetItemCommand({
					TableName: 'TTLTest',
					Key: { id: { S: 'expires-soon' } },
				})
			)
			expect(result.Item).toBeDefined()

			server.advanceTime(120 * 1000)

			result = await client.send(
				new GetItemCommand({
					TableName: 'TTLTest',
					Key: { id: { S: 'expires-soon' } },
				})
			)
			expect(result.Item).toBeUndefined()

			result = await client.send(
				new GetItemCommand({
					TableName: 'TTLTest',
					Key: { id: { S: 'expires-later' } },
				})
			)
			expect(result.Item).toBeDefined()
		})

		it('should emit stream records on TTL expiration', async () => {
			const client = server.getClient()

			await client.send(
				new CreateTableCommand({
					TableName: 'TTLStream',
					KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
					AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
					BillingMode: 'PAY_PER_REQUEST',
					StreamSpecification: {
						StreamEnabled: true,
						StreamViewType: 'OLD_IMAGE',
					},
				})
			)

			const store = server.getTableStore()
			const table = store.getTable('TTLStream')
			table.setTtlSpecification({ AttributeName: 'ttl', Enabled: true })

			const nowSeconds = Math.floor(Date.now() / 1000)

			await client.send(
				new PutItemCommand({
					TableName: 'TTLStream',
					Item: {
						id: { S: 'ttl-stream-test' },
						name: { S: 'Will Expire' },
						ttl: { N: String(nowSeconds + 30) },
					},
				})
			)

			const records: StreamRecord[] = []
			const unsubscribe = server.onStreamRecord('TTLStream', record => {
				records.push(record)
			})

			server.advanceTime(60 * 1000)

			const removeRecords = records.filter(r => r.eventName === 'REMOVE')
			expect(removeRecords.length).toBe(1)
			expect(getStringValue(removeRecords[0]?.dynamodb.OldImage?.name)).toBe('Will Expire')

			unsubscribe()
		})
	})
})
