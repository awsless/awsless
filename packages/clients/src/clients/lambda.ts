
import { LambdaClient } from '@aws-sdk/client-lambda'
import { globalClient } from '../helper.js'

export const lambdaClient = globalClient(() => {
	return new LambdaClient({})
})
