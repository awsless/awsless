
import { DescribeTableCommand } from '@aws-sdk/client-dynamodb'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { describe, it, expect } from 'vitest'
import { startDynamoDB } from '../../src'

describe('DynamoDB', () => {

	const dynamo = startDynamoDB({
		path: './test/dynamodb.yml',
		seed: {
			test: [
				{ id: 1, name: 'test' }
			]
		}
	})

	it('should ping the server', async () => {
		await dynamo.ping()
	})

	it('should provide a client & document client', () => {
		expect(dynamo.getClient()).toBeDefined()
		expect(dynamo.getClient().send.bind(null)).toBeDefined()
		expect(dynamo.getDocumentClient()).toBeDefined()
		expect(dynamo.getDocumentClient().send.bind(null)).toBeDefined()
	})

	it('should have created test table', async () => {
		const client = dynamo.getClient()
		const command = new DescribeTableCommand({ TableName: 'test' })
		const result = await client.send(command)
		expect(result.Table?.TableName).toBe('test')
	})

	it('should have seeded the test table', async () => {
		const client = dynamo.getDocumentClient()
		const command = new GetCommand({ TableName: 'test', Key: { id: 1 } })
		const result = await client.send(command)
		expect(result.Item).toStrictEqual({ id: 1, name: 'test' })
	})
})
