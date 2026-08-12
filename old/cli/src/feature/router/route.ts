import { Input } from '@terraforge/core'

export type Route = {
	type: 'url' | 'lambda' | 's3'
	domainName: Input<string>

	// A regex that the request path needs to match for routes
	// that are more specific than their route store key.
	match?: string

	// The param names for each capture group in the match regex.
	params?: string[]

	removeCookies?: boolean
	forwardHost?: boolean
	urlEncodedQueryString?: boolean

	hostHeader?: string
	originPath?: string
	customHeaders?: Record<string, string>

	readTimeout?: number
	responseCompletionTimeout?: number
	connectionAttempts?: number
	connectionTimeout?: number
	keepAliveTimeout?: number

	rewrite?: {
		regex?: string
		to: string
	}
}

// The value of a route store entry is either a single route, a list
// of routes, or an index that points to sharded route entries.
export type RouteIndex = {
	list: number
}

// The max size of a value in the CloudFront key value store is 1KB.
const MAX_VALUE_SIZE = 1000

// Convert the routes into route store entries, where route lists
// that are too big for a single key value pair are sharded over
// multiple entries behind a route index.
export const createRouteStoreEntries = (routes: Record<string, unknown>) => {
	const entries: { key: string; value: string }[] = []

	for (const [key, value] of Object.entries(routes)) {
		const json = JSON.stringify(value)

		if (Array.isArray(value) && Buffer.byteLength(json, 'utf8') > MAX_VALUE_SIZE) {
			entries.push({
				key,
				value: JSON.stringify({ list: value.length } satisfies RouteIndex),
			})

			value.forEach((route, index) => {
				entries.push({
					key: `${key}#${index}`,
					value: JSON.stringify(route),
				})
			})
		} else {
			entries.push({ key, value: json })
		}
	}

	return entries
}
