import { constantCase } from 'change-case'
import { createProxy } from '../proxy.js'

// `awsless bind` puts the bound values in the site build's env & the
// bundler exposes them here, so a vite site must list AUTH_ in envPrefix.
const boundEnv = (name: string) => {
	const env = (import.meta as { env?: Record<string, string | undefined> }).env

	return env?.[name]
}

export interface AuthResources {}

export const Auth: AuthResources = /*@__PURE__*/ createProxy(name => {
	return getAuthProps(name)
})

export const getAuthProps = (name: string) => {
	const id = constantCase(name)

	return {
		userPoolId: boundEnv(`AUTH_${id}_USER_POOL_ID`),
		clientId: boundEnv(`AUTH_${id}_CLIENT_ID`),
	} as const
}
