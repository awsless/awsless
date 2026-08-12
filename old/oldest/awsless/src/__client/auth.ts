import { constantCase } from 'change-case'
import { createProxy } from '../node/util.js'
import { getEnv } from './env.js'

export const getAuthProps = (name: string) => {
	const id = constantCase(name)

	return {
		userPoolId: getEnv(`AUTH_${id}_USER_POOL_ID`)!,
		clientId: getEnv(`AUTH_${id}_CLIENT_ID`)!,
	} as const
}

export interface AuthResources {}

export const Auth: AuthResources = /*@__PURE__*/ createProxy(name => {
	return getAuthProps(name)
})
