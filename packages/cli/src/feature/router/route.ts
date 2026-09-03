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
	| (RouteProps & {
			type: 'lambda'
			// A stand-alone lambda route brings its own function url host,
			// without one the route targets the shared bundle url.
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

// Routes without a destination target the shared bundle url.
export const hasBundleRoutes = (routes: Record<string, Route | Route[]>) => {
	return Object.values(routes)
		.flat()
		.some(route => route.type === 'lambda' && !route.domainName)
}

// The route store caps a value at 1KB.
const MAX_VALUE_SIZE = 1000

// Serialized lambda routes gain a function url host, which tops out under 64 chars.
const ORIGIN_PLACEHOLDER = 'x'.repeat(64)

export const assertRouteValueSize = (key: string, route: Route | Route[]) => {
	const withOrigin = (entry: Route) => {
		return entry.type === 'lambda' && !entry.domainName ? { ...entry, domainName: ORIGIN_PLACEHOLDER } : entry
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
