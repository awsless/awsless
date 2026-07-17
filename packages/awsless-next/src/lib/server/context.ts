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
