import {
	SSMClient,
	GetParametersCommand,
	GetParametersCommandInput,
	PutParameterCommand,
} from '@aws-sdk/client-ssm'
import { mockClient } from 'aws-sdk-vitest-mock'
import { nextTick, mockFn } from '@awsless/utils'
// @ts-ignore
import { Mock } from 'vitest'

export const mockSSM = (values: Record<string, string>) => {
	const mock = mockFn(() => {})

	const client = mockClient(SSMClient)

	client
		.on(GetParametersCommand)
		.callsFake(async (input: GetParametersCommandInput) => {
			await nextTick(mock)
			return {
				Parameters: (input.Names || []).map(name => {
					return {
						Name: name,
						Value: values[name] || '',
					}
				}),
			}
		})

	client
		.on(PutParameterCommand)
		.callsFake(async () => {
			await nextTick(mock)
			return {}
		})

	beforeEach &&
		beforeEach(() => {
			mock.mockClear()
		})

	return mock
}
