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
	})
})
