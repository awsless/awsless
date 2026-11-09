import { Input } from '@terraforge/core'
import { ExpectedError } from '../../error.js'

type RouteProps = {
	// A regex that the request path needs to match for routes
	// that are more specific than their route store key.
	match?: string

	// The param names for each capture group in the match regex.
	params?: string[]

	removeCookies?: boolean
	forwardHost?: boolean
	urlEncodedQueryString?: boolean

	requestHeaders?: Record<string, string>

	hostHeader?: string
	originPath?: string
	customHeaders?: Record<string, Input<string>>

	readTimeout?: number
	responseCompletionTimeout?: number
	connectionAttempts?: number
	connectionTimeout?: number
	keepAliveTimeout?: number

	rewrite?: {
		regex?: string
		to: Input<string>
	}
}

export type Route =
	// A stand-alone lambda's own function url.
	| (RouteProps & {
			type: 'lambda'
			domainName: Input<string>
	  })
	// A bundle route on the event function, for one that needs the layers (the
	// image & icon servers' sharp); its url filled in for the route store.
	| (RouteProps & {
			type: 'event-function'
			domainName?: Input<string>
	  })
	| (RouteProps & {
			type: 's3'
			domainName: Input<string>
	  })
	| (RouteProps & {
			type: 'url'
			domainName: Input<string>
	  })
	// A bundle route on the web function, its endpoint and deployment filled
	// in for the route store.
	| (RouteProps & {
			type: 'web-function'
			domainName?: Input<string>
			deploymentId?: string
	  })

export const isWebFunctionRoute = (route: Route): route is Extract<Route, { type: 'web-function' }> => {
	return route.type === 'web-function'
}

export const isEventFunctionRoute = (route: Route): route is Extract<Route, { type: 'event-function' }> => {
	return route.type === 'event-function'
}

export const hasRoute = (routes: Record<string, Route | Route[]>, isMatch: (route: Route) => boolean) => {
	return Object.values(routes).flat().some(isMatch)
}

// The route store caps a value at 1KB.
const MAX_VALUE_SIZE = 1000

// A bundle route gains its origin's host when stored, which tops out under 64
// chars, and a web route its deployment id too.
const ORIGIN_PLACEHOLDER = 'x'.repeat(64)

export const assertRouteValueSize = (key: string, route: Route | Route[]) => {
	const withOrigin = (entry: Route) => {
		if (isWebFunctionRoute(entry)) {
			return { ...entry, domainName: ORIGIN_PLACEHOLDER, deploymentId: ORIGIN_PLACEHOLDER }
		}

		return isEventFunctionRoute(entry) ? { ...entry, domainName: ORIGIN_PLACEHOLDER } : entry
	}

	// Route lists shard over multiple entries, so only a single route can outgrow one.
	for (const entry of Array.isArray(route) ? route : [route]) {
		if (Buffer.byteLength(JSON.stringify(withOrigin(entry)), 'utf8') > MAX_VALUE_SIZE) {
			throw new ExpectedError(`The route value of the "${key}" route key is too large.`)
		}
	}
}

// Route lists that are too big for a single key value pair are
// sharded over multiple entries behind a route index.
export const createRouteStoreEntries = (key: string, route: object | object[]) => {
	const value = JSON.stringify(route)

	if (!Array.isArray(route) || Buffer.byteLength(value, 'utf8') <= MAX_VALUE_SIZE) {
		return [{ key, value }]
	}

	return [
		{ key, value: JSON.stringify({ list: route.length }) },
		...route.map((entry, index) => ({
			key: `${key}#${index}`,
			value: JSON.stringify(entry),
		})),
	]
}
