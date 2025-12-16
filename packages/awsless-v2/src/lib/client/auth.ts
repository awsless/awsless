import { constantCase } from 'change-case'
import { createProxy } from '../proxy.js'
import { getBindEnv } from './util.js'

export interface AuthResources {}

export const Auth: AuthResources = /*@__PURE__*/ createProxy(name => {
	return getAuthProps(name)
})

export const getAuthProps = (name: string) => {
	const id = constantCase(name)

	return {
		userPoolId: getBindEnv(`AUTH_${id}_USER_POOL_ID`)!,
		clientId: getBindEnv(`AUTH_${id}_CLIENT_ID`)!,
	} as const
}
