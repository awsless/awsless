
import { SQSClient } from '@aws-sdk/client-sqs'
import { globalClient } from '../helper.js'

export const sqsClient = globalClient(() => {
	return new SQSClient({})
})
