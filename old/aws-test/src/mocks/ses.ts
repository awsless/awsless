import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { mockClient } from 'aws-sdk-client-mock'

export const mockSES = () => {
	const fn = vi.fn()

	mockClient(SESv2Client)
		.on(SendEmailCommand)
		.callsFake(() => {
			fn()
		})

	beforeEach(() => {
		fn.mockClear()
	})

	return fn
}
