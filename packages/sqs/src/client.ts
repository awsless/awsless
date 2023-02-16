import { SQSClient } from '@aws-sdk/client-sqs'
import { globalClient } from '@awsless/utils'

export const sqsClient = globalClient(() => {
	return new SQSClient({})
})
