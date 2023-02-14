
import { Options } from '../types.js'
import { dynamoDBDocumentClient } from '@awsless/clients'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

export const send = (command:any, options:Options) => {
	const client:DynamoDBDocumentClient = options.client || dynamoDBDocumentClient.get()
	return client.send(command)
}
