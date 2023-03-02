
import { Options } from '../types.js'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { dynamoDBDocumentClient } from '../client.js'

export const send = (command:any, options:Options) => {
	const client:DynamoDBDocumentClient = options.client || dynamoDBDocumentClient()
	return client.send(command)
}
