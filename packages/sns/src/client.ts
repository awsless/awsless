import { SNSClient } from '@aws-sdk/client-sns'
import { globalClient } from '@awsless/utils'

export const snsClient = globalClient(() => {
	return new SNSClient({})
})
