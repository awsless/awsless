import { SendEmailCommand } from '@aws-sdk/client-sesv2'
import { sesClient } from './client'
import { SendEmail } from './types'

export const sendEmail = async ({
	client = sesClient(),
	subject,
	from,
	to,
	html,
	text,
	headers,
	attachments,
}: SendEmail) => {
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

				...(attachments?.length
					? {
							Attachments: attachments.map(({ filename, contentType, content }) => ({
								FileName: filename,
								ContentType: contentType,
								ContentDisposition: 'ATTACHMENT' as const,
								// SES defaults to 7-bit, which corrupts a binary file.
								ContentTransferEncoding: 'BASE64' as const,
								RawContent: content,
							})),
						}
					: {}),
			},
		},
	})

	return client.send(command)
}
