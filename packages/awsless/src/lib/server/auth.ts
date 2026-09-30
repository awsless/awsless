import { constantCase } from 'change-case'
import { createProxy } from '../proxy.js'

export const getAuthProps = (name: string) => {
	return {
		issuer: process.env[`AUTH_${constantCase(name)}_ISSUER`],
		clientId: process.env[`AUTH_${constantCase(name)}_CLIENT_ID`],
	} as const
}

export interface AuthResources {}

export const Auth: AuthResources = /*@__PURE__*/ createProxy(name => {
	const { issuer, clientId } = getAuthProps(name)
	return {
		issuer,
		clientId,
	}
})
