// import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider'
import { constantCase } from 'change-case'
import { createProxy } from '../proxy.js'

export const getAuthProps = (name: string) => {
	return {
		userPoolId: process.env[`AUTH_${constantCase(name)}_USER_POOL_ID`],
		clientId: process.env[`AUTH_${constantCase(name)}_CLIENT_ID`],
	} as const
}

export interface AuthResources {}

export const Auth: AuthResources = /*@__PURE__*/ createProxy(name => {
	const { userPoolId, clientId } = getAuthProps(name)
	// const client = new CognitoIdentityProviderClient({})
	return {
		userPoolId,
		clientId,
		// async listUsers(limit: number, filter?: string) {
		// 	return client.send(
		// 		new ListUsersCommand({
		// 			UserPoolId: userPoolId,
		// 			Limit: limit,
		// 			Filter: filter,
		// 		})
		// 	)
		// },
	}
})
