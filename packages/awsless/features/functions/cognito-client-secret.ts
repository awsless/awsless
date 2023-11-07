import { CloudFormationCustomResourceEvent } from 'aws-lambda'
import {
	CognitoIdentityProviderClient,
	DescribeUserPoolClientCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import { send } from '../util.js'

const client = new CognitoIdentityProviderClient({})

export const handler = async (event: CloudFormationCustomResourceEvent) => {
	const type = event.RequestType
	const userPoolId = event.ResourceProperties.userPoolId
	const clientId = event.ResourceProperties.clientId

	console.log('Type:', type)
	console.log('UserPoolId:', userPoolId)
	console.log('ClientId:', clientId)

	try {
		if (type === 'Create' || type === 'Update') {
			const input = {
				UserPoolId: userPoolId,
				ClientId: clientId,
			}

			const command = new DescribeUserPoolClientCommand(input)
			const response = await client.send(command)
			const secret = response.UserPoolClient?.ClientSecret

			await send(event, clientId, 'SUCCESS', {
				secret,
			})
		} else {
			await send(event, clientId, 'SUCCESS')
		}
	} catch (error) {
		if (error instanceof Error) {
			await send(event, clientId, 'FAILED', {}, error.message)
		} else {
			await send(event, clientId, 'FAILED', {}, 'Unknown error')
		}

		console.error(error)
	}
}
