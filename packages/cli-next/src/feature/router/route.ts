import { Input } from '@terraforge/core'

type RouteProps = {
	forwardHost?: boolean
	urlEncodedQueryString?: boolean

	requestHeaders?: Record<string, string>

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
