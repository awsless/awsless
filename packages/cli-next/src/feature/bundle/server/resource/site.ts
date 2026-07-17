import type { LambdaFunctionURLEvent } from 'aws-lambda'
import type { RouteMatcher } from './types.js'
import { webRoute } from './util.js'

export const siteHandler: RouteMatcher<LambdaFunctionURLEvent> = event => {
	if (typeof event?.['$awsless-route'] === 'string') {
		return
	}

	const route = event?.headers?.['x-awsless-route']

	if (typeof route === 'string' && route.split(':')[1] === 'site') {
		return webRoute(route, event)
	}

	return
}
