import { mockSES, sendEmail } from '../src'

describe('SES Mock', () => {
	const ses = mockSES()

	it('should send ses email', async () => {
		await sendEmail({
			from: 'support@jacksclub.io',
			to: ['info@jacksclub.io'],
			subject: 'Email Subject',
			html: '<p>Hello world</p>',
		})

		expect(ses).toBeCalledTimes(1)

		// No text part or headers unless asked for.
		const simple = (ses.mock.calls[0]![0] as any).Content.Simple

		expect(simple.Body).toEqual({ Html: { Data: '<p>Hello world</p>', Charset: 'UTF-8' } })
		expect(simple.Headers).toBeUndefined()
	})

	it('should send the text part and headers', async () => {
		await sendEmail({
			from: 'support@jacksclub.io',
			to: ['info@jacksclub.io'],
			subject: 'Email Subject',
			html: '<p>Hello world</p>',
			text: 'Hello world',
			headers: [
				{ name: 'List-Unsubscribe', value: '<https://example.com/unsubscribe?token=abc>' },
				{ name: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' },
			],
		})

		expect(ses).toBeCalledWith(
			expect.objectContaining({
				Content: {
					Simple: {
						Subject: { Data: 'Email Subject', Charset: 'UTF-8' },
						Body: {
							Html: { Data: '<p>Hello world</p>', Charset: 'UTF-8' },
							Text: { Data: 'Hello world', Charset: 'UTF-8' },
						},
						Headers: [
							{ Name: 'List-Unsubscribe', Value: '<https://example.com/unsubscribe?token=abc>' },
							{ Name: 'List-Unsubscribe-Post', Value: 'List-Unsubscribe=One-Click' },
						],
					},
				},
			})
		)
	})
})
