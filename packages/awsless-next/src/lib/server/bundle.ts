import { kebabCase } from 'change-case'
import { getCurrentRoute } from './context.js'
import { bindGlobalResourceName } from './util.js'

// The payload property used to route lambda invokes to the right bundle handler.
export const ROUTE_PROPERTY = '$awsless-route'
export const BUNDLE_NAME = /*@__PURE__*/ bindGlobalResourceName('function')('bundle')
export const BUNDLE_QUALIFIER = 'live'

export { getCurrentRoute, invokeRoute, isInsideBundle, withRoute } from './context.js'
export type { RouteInvoker } from './context.js'

export const formatRouteKey = (stackName: string, resourceType: string, resourceName: string) => {
	return [stackName, resourceType, resourceName].map(v => kebabCase(v)).join(':')
}

export const formatRoutePayload = (routeKey: string, event: unknown) => {
	return {
		[ROUTE_PROPERTY]: routeKey,
		event,
	}
}

// Env vars are scoped per route key inside the shared bundle env.
export const formatRouteEnvName = (routeKey: string, name: string) => {
	return `${routeKey}:${name}`
}

export const getRouteEnv = (name: string) => {
	const routeKey = getCurrentRoute() ?? process.env.AWSLESS_ROUTE

	return process.env[routeKey ? formatRouteEnvName(routeKey, name) : name]
}
