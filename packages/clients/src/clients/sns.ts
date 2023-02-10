
import { SNSClient } from '@aws-sdk/client-sns'
import { globalClient } from '../helper.js'

export const snsClient = globalClient(() => {
	return new SNSClient({})
})
