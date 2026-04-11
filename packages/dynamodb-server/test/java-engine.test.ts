import {
	CreateTableCommand,
	DeleteTableCommand,
	GetItemCommand,
	ListTablesCommand,
	PutItemCommand,
} from '@aws-sdk/client-dynamodb'
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { DynamoDBServer } from '../src/index.js'

describe('Java DynamoDB Engine', () => {
	const server = new DynamoDBServer({ engine: 'java' })

	beforeAll(async () => {
		await server.listen(8123)
	}, 30000) // Longer timeout for Java startup

	afterAll(async () => {
		await server.stop()
	})

	it('should report the correct engine type', () => {
		expect(server.engine).toBe('java')
	})

	it('should create and list tables', async () => {
		const client = server.getClient()

		await client.send(
			new CreateTableCommand({
				TableName: 'JavaTestTable',
				KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
				AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }],
				BillingMode: 'PAY_PER_REQUEST',
			})
		)

		const result = await client.send(new ListTablesCommand({}))
		expect(result.TableNames).toContain('JavaTestTable')

		// Cleanup
		await client.send(new DeleteTableCommand({ TableName: 'JavaTestTable' }))
	})

	it('should put and get items', async () => {
		const client = server.getClient()

		await client.send(
			new CreateTableCommand({
				TableName: 'JavaItems',
				KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
				AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
				BillingMode: 'PAY_PER_REQUEST',
			})
		)

		await client.send(
			new PutItemCommand({
				TableName: 'JavaItems',
				Item: {
					id: { S: 'test-item' },
					name: { S: 'Test Name' },
					value: { N: '42' },
				},
			})
		)

		const result = await client.send(
			new GetItemCommand({
				TableName: 'JavaItems',
				Key: { id: { S: 'test-item' } },
			})
		)

		expect(result.Item?.name?.S).toBe('Test Name')
		expect(result.Item?.value?.N).toBe('42')

		// Cleanup
		await client.send(new DeleteTableCommand({ TableName: 'JavaItems' }))
	})

	it('should throw when using memory-only features', () => {
		expect(() => server.advanceTime(1000)).toThrow('advanceTime is not supported with the Java engine')
		expect(() => server.setTime(Date.now())).toThrow('setTime is not supported with the Java engine')
		expect(() => server.getTime()).toThrow('getTime is not supported with the Java engine')
		expect(() => server.reset()).toThrow('reset is not supported with the Java engine')
		expect(() => server.getTableStore()).toThrow('getTableStore is not supported with the Java engine')
		expect(() => server.onStreamRecord('test', () => {})).toThrow(
			'onStreamRecord is not supported with the Java engine'
		)
	})
})
