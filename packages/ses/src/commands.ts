import { SendEmailCommand } from '@aws-sdk/client-sesv2'
import { sesClient } from './client'
import { SendEmail } from './types'

export const sendEmail = async ({ client = sesClient(), subject, from, to, html }: SendEmail) => {
	const command = new SendEmailCommand({
		FromEmailAddress: from,
		Destination: {
			ToAddresses: to,
		},
		Content: {
			Simple: {
				Subject: {
					Data: subject,
					Charset: 'UTF-8',
				},

				Body: {
					Html: {
						Data: html,
						Charset: 'UTF-8',
					},
				},
			},
		},
	})

	return client.send(command)
}
