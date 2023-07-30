
import { globalClient } from '@awsless/utils'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { Options } from './types/options.js'

export const dynamoDBClient = /* @__PURE__ */ globalClient(() => {
	return new DynamoDBClient({})
})

export const dynamoDBDocumentClient = /* @__PURE__ */ globalClient(() => {
	return DynamoDBDocumentClient.from(dynamoDBClient(), {
		marshallOptions: {
			removeUndefinedValues: true
		}
	})
})

export const client = (options:Options) => {
	return options.client || dynamoDBClient()
}
