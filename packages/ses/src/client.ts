import { SESv2Client } from '@aws-sdk/client-sesv2'
import { globalClient } from '@awsless/utils'

export const sesClient = globalClient(() => {
	return new SESv2Client({})
})
