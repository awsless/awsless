import { SESv2Client } from '@aws-sdk/client-sesv2'

export interface SendEmail {
	client?: SESv2Client

	subject: string
	from: string
	to: string[]
	html: string
}
