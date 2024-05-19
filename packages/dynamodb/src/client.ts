import { globalClient } from '@awsless/utils'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { Options } from './types/options.js'
import { NodeHttpHandler } from '@smithy/node-http-handler'

export const dynamoDBClient = /* @__PURE__ */ globalClient(() => {
	return new DynamoDBClient({
		maxAttempts: 2,
		requestHandler: new NodeHttpHandler({
			connectionTimeout: 3 * 1000,
			requestTimeout: 3 * 1000,
		}),
	})
})

// // Use default Https agent, but override the socket timeout
// const requestHandler = new NodeHttpHandler({
// 	connectionTimeout: 30000,
// 	socketTimeout: 30000,
//   });

//   const options = {
// 	region: AWS_REGION,
// 	maxAttempts: 2,
// 	requestHandler, // Use handler with alternate settings for timeouts
//   };
//   export const dynamodbClient = new DynamoDBClient(options);

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
