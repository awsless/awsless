
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { mockClient } from 'aws-sdk-client-mock'
import { asyncCall, Func, mockFn } from '../helpers/mock'

export const mockSES = (fn: Func = () => {}) => {
	const mock = mockFn(fn)

	mockClient(SESv2Client)
		.on(SendEmailCommand)
		.callsFake(() => {
			return asyncCall(mock)
		})

	beforeEach && beforeEach(() => {
		mock.mockClear()
	})

	return mock
}
