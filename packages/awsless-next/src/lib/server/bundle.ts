import { AsyncLocalStorage } from 'node:async_hooks'

export type RouteInvoker = (routeKey: string, payload: unknown) => Promise<unknown>

type RouteContext = {
	routeKey: string
	invoke: RouteInvoker
}

const routeContext = new AsyncLocalStorage<RouteContext>()

export const getCurrentRoute = () => routeContext.getStore()?.routeKey

export const withRoute = <T>(routeKey: string, invoke: RouteInvoker, callback: () => T) => {
	return routeContext.run({ routeKey, invoke }, callback)
}

export const isInsideBundle = () => routeContext.getStore() !== undefined

export const invokeRoute = (routeKey: string, payload: unknown) => {
	const invoke = routeContext.getStore()?.invoke

	if (!invoke) {
		throw new Error('Route invocations are only available inside the bundle')
	}

	return invoke(routeKey, payload)
}

// The payload property used to route lambda invokes to the right bundle handler.
export const ROUTE_PROPERTY = '$awsless-route'

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
	// The env fallback covers module-scope reads that run during the lazy
	// import, before withRoute's AsyncLocalStorage context is entered.
	const routeKey = getCurrentRoute() ?? process.env.AWSLESS_ROUTE

	return process.env[routeKey ? formatRouteEnvName(routeKey, name) : name]
}
