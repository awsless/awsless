import { SendEmailCommand } from '@aws-sdk/client-sesv2'
import { sesClient } from './client'
import { SendEmail } from './types'

export const sendEmail = async ({ client = sesClient(), subject, from, to, html, text, headers }: SendEmail) => {
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
					...(text === undefined ? {} : { Text: { Data: text, Charset: 'UTF-8' } }),
				},

				...(headers?.length ? { Headers: headers.map(({ name, value }) => ({ Name: name, Value: value })) } : {}),
			},
		},
	})

	return client.send(command)
}
