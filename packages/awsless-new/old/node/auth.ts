import { constantCase } from 'change-case'
import { getGlobalResourceName } from './resource.js'
import { createProxy } from './util.js'

export const getAuthName = getGlobalResourceName

export interface AuthResources {}

export const Auth: AuthResources = /*@__PURE__*/ createProxy(name => {
	return getAuthProps(name)
})

export const getAuthProps = (name: string) => {
	const env = process.env
	const id = constantCase(name)

	return {
		name: getAuthName(name),
		// userPoolId: env[`AWSLESS_CLIENT_AUTH_${id}_USER_POOL_ID`]!,
		// clientId: env[`AWSLESS_CLIENT_AUTH_${id}_CLIENT_ID`]!,
		// clientSecret: env[`AWSLESS_CLIENT_AUTH_${id}_CLIENT_SECRET`]!,
		userPoolId: env[`AUTH_${id}_USER_POOL_ID`]!,
		clientId: env[`AUTH_${id}_CLIENT_ID`]!,
		clientSecret: env[`AUTH_${id}_CLIENT_SECRET`]!,
	} as const
}
