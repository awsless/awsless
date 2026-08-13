import type { LambdaFunctionURLEvent } from 'aws-lambda'
import { ROUTE_HEADER, ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher } from './types.js'
import { routeType, webRoute } from './util.js'

export const siteHandler: RouteMatcher<LambdaFunctionURLEvent> = event => {
	if (typeof event?.[ROUTE_PROPERTY] === 'string') {
		return
	}

	const route = event?.headers?.[ROUTE_HEADER]

	if (typeof route === 'string' && routeType(route) === 'site') {
		return webRoute(route, event)
	}

	return
}
