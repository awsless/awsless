
import { SSMClient, GetParametersCommand, GetParametersCommandInput } from '@aws-sdk/client-ssm'
import { mockClient } from 'aws-sdk-client-mock'
import { asyncCall, mockFn } from '../helpers/mock'

export const mockSSM = (values:Record<string, string>) => {
	const mock = mockFn(() => {})

	mockClient(SSMClient)
		.on(GetParametersCommand)
		.callsFake(async (input: GetParametersCommandInput) => {
			await asyncCall(mock)
			return {
				Parameters: (input.Names || []).map((name) => {
					return {
						Name: name,
						Value: values[name] || ''
					}
				})
			}
		})

	beforeEach && beforeEach(() => {
		mock.mockClear()
	})

	return mock
}
