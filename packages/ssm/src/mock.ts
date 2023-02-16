import { SSMClient, GetParametersCommand, GetParametersCommandInput } from '@aws-sdk/client-ssm'
import { mockClient } from 'aws-sdk-client-mock'

export const mockSSM = (values: Record<string, string>) => {
	mockClient(SSMClient)
		.on(GetParametersCommand)
		.callsFake((input: GetParametersCommandInput) => {
			return {
				Parameters: input.Names.map(name => {
					return {
						Name: name,
						Value: values[name] || '',
					}
				}),
			}
		})
}
