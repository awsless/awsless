import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { globalClient } from '@awsless/utils'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import { Options } from './types/options.js'

export const dynamoDBClient = /* @__PURE__ */ globalClient(() => {
	return new DynamoDBClient({
		maxAttempts: 2,
		// Temporary: DynamoDB's IPv4 endpoint, whatever AWS_USE_DUALSTACK_ENDPOINT
		// says, until AWS finishes DynamoDB's IPv6 rollout. As of 2026-11 its
		// dual-stack endpoint hangs over IPv6 from a VPC in eu-west-1 (through
		// the egress-only gateway and a dual-stack gateway endpoint alike, while
		// every other AWS endpoint answers), so each new connection waited out
		// Node's 250 ms happy eyeballs timeout. Remove once a fresh connection to
		// dynamodb.<region>.api.aws answers over IPv6 from the VPC.
		useDualstackEndpoint: false,
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

export const getClient = (options: Options) => {
	return options.client || dynamoDBClient()
}
