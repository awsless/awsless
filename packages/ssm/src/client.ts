import { SSMClient } from '@aws-sdk/client-ssm'
import { globalClient } from '@awsless/utils'

export const ssmClient = globalClient(() => {
	return new SSMClient({})
})
