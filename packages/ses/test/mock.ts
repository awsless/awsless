import { mockSES } from '../src'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'

describe('SES Mock', () => {
	const ses = mockSES()

	it('should send ses email', async () => {
		const client = new SESv2Client({})
		await client.send(
			new SendEmailCommand({
				FromEmailAddress: 'info@jacksclub.io',
				Destination: {
					ToAddresses: ['info@jacksclub.io'],
				},
				Content: {
					Simple: {
						Subject: {
							Data: 'Email Subject',
							Charset: 'UTF-8',
						},

						Body: {
							Html: {
								Data: '<p>Hello world</p>',
								Charset: 'UTF-8',
							},
						},
					},
				},
			})
		)

		expect(ses).toBeCalledTimes(1)
	})
})
