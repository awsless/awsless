import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { SCHEMA_TABLE } from './config'

const client = new DynamoDBClient({})
const schema: Record<string, string> = {}

export const getFunctionName = async (name: string) => {
	if (name in schema) {
		return schema[name]
	}

	const entry = await client.send(
		new GetItemCommand({
			TableName: SCHEMA_TABLE,
			Key: {
				query: {
					S: name,
				},
			},
		})
	)

	const fn = entry.Item?.function?.S

	if (fn) {
		schema[name] = fn
	}

	return fn
}

export const invalidate = (name: string) => {
	delete schema[name]
}
