
import { SSMClient } from '@aws-sdk/client-ssm'
import { globalClient } from '../helper.js'

export const ssmClient = globalClient(() => {
	return new SSMClient({})
})
