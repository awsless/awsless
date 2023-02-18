
import { LambdaClient } from '@aws-sdk/client-lambda'
import { globalClient } from '@awsless/utils'

export const lambdaClient = globalClient(() => {
	return new LambdaClient({})
})
