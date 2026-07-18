import { Input } from '@terraforge/core'

type RouteProps = {
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
	  })
	| (RouteProps & {
			type: 's3'
			domainName: Input<string>
	  })
	| (RouteProps & {
			type: 'url'
			domainName: Input<string>
	  })
