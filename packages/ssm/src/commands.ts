import { PutParameterCommand } from '@aws-sdk/client-ssm'
import { ssmClient } from './client'
import { PutParameter } from './types'

export const putParameter = ({ client = ssmClient(), name, value, type = 'String' }: PutParameter) => {
	const command = new PutParameterCommand({
		Name: name,
		Value: value,
		Type: type,
		Overwrite: true,
		Tier: 'Standard',
	})

	return client.send(command)
}
