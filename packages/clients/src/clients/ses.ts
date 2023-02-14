import { SESv2Client } from '@aws-sdk/client-sesv2'
import { globalClient } from '../helper.js'

export const sesClient = globalClient(() => {
	return new SESv2Client({})
})
