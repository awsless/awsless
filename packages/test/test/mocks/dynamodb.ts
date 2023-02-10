
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { describe, it, expect } from 'vitest'
import { mockDynamoDB } from '../../src'

describe('DynamoDB Mock', () => {

	mockDynamoDB({
		path: './test/dynamodb.yml',
		seed: {
			test: [
				{ id: 1, name: 'test' }
			]
		}
	})

	it('should have created the table', async () => {
		const client = new DynamoDBClient({})
		const result = await client.send(new ListTablesCommand({}))
		expect(result.TableNames).toStrictEqual(['test'])
	})

	it('should have seeded the table', async () => {
		const client = new DynamoDBClient({})
		const documentClient = DynamoDBDocumentClient.from(client)
		const command = new GetCommand({ TableName: 'test', Key: { id: 1 } })
		const result = await documentClient.send(command)
		expect(result.Item).toStrictEqual({ id: 1, name: 'test' })
	})
})
