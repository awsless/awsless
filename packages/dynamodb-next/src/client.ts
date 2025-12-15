import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { globalClient } from '@awsless/utils'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import { Options } from './types/options.js'

export const dynamoDBClient = /* @__PURE__ */ globalClient(() => {
	return new DynamoDBClient({
		maxAttempts: 2,
		requestHandler: new NodeHttpHandler({
			connectionTimeout: 3 * 1000,
			requestTimeout: 3 * 1000,
		}),
	})
})

export const dynamoDBDocumentClient = /* @__PURE__ */ globalClient(() => {
	return DynamoDBDocumentClient.from(dynamoDBClient(), {
		marshallOptions: {
			removeUndefinedValues: true,
		},
	})
})

export const client = (options: Options) => {
	return options.client || dynamoDBClient()
}
