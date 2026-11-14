import type { LambdaFunctionURLEvent } from 'aws-lambda'
import { ROUTE_HEADER, ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher } from './types.js'
import { invokedRoute, routeType, webRoute } from './util.js'

export const iconHandler: RouteMatcher<LambdaFunctionURLEvent> = event => {
	const route = event?.[ROUTE_PROPERTY]

	if (typeof route === 'string') {
		if (routeType(route) === 'icon') {
			return invokedRoute(route, event.event)
		}

		return
	}

	const requestRoute = event?.headers?.[ROUTE_HEADER]

	if (typeof requestRoute === 'string' && routeType(requestRoute) === 'icon') {
		return webRoute(requestRoute, event)
	}

	return
}
