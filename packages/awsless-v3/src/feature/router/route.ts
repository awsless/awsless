import { Input } from '@terraforge/core'

export type Route = {
	type: 'url' | 'lambda' | 's3'
	domainName: Input<string>

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
