import type { LambdaFunctionURLEvent } from 'aws-lambda'
import { ROUTE_HEADER, ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher } from './types.js'
import { invokedRoute, routeType, webRoute } from './util.js'

export const imageHandler: RouteMatcher<LambdaFunctionURLEvent> = event => {
	const route = event?.[ROUTE_PROPERTY]

	if (typeof route === 'string') {
		if (routeType(route) === 'image') {
			return invokedRoute(route, event.event)
		}

		return
	}

	const requestRoute = event?.headers?.[ROUTE_HEADER]

	if (typeof requestRoute === 'string' && routeType(requestRoute) === 'image') {
		return webRoute(requestRoute, event)
	}

	return
}
