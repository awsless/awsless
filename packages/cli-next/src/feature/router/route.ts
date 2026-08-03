import { Input } from '@terraforge/core'

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
	customHeaders?: Record<string, string>

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
