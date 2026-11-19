import { SQSClient } from '@aws-sdk/client-sqs'
import { globalClient } from '@awsless/utils'

export const sqsClient = globalClient(() => {
	// Send to the endpoint the client resolved (dual-stack inside awsless's
	// lambdas) rather than the queue url's host, which made the SDK warn on
	// every send that the two differ.
	return new SQSClient({ useQueueUrlAsEndpoint: false })
})
