import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { mockClient } from 'aws-sdk-client-mock'

export const mockSES = (handler?: (input: unknown) => void) => {
	const fn = vi.fn(handler ?? (() => {}))

	// The sdk mock lib lags behind the sdk's middleware types.
	mockClient(SESv2Client as unknown as Parameters<typeof mockClient>[0])
		.on(SendEmailCommand as never)
		.callsFake(input => {
			fn(input)
		})

	beforeEach(() => {
		fn.mockClear()
	})

	return fn
}
