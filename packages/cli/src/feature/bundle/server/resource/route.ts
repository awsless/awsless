import type { LambdaFunctionURLEvent } from 'aws-lambda'
import type { RouteMatcher } from './types.js'
import { routeType, webRoute } from './util.js'

export const routeHandler: RouteMatcher<LambdaFunctionURLEvent> = event => {
	if (typeof event?.['$awsless-route'] === 'string') {
		return
	}

	const route = event?.headers?.['x-awsless-route']

	if (typeof route === 'string' && routeType(route) === 'route') {
		return webRoute(route, event)
	}

	return
}
