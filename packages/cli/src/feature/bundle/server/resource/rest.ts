import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { ROUTE_HEADER, ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher } from './types.js'
import { routeType, webRoute } from './util.js'

export const restHandler: RouteMatcher<APIGatewayProxyEventV2> = event => {
	if (typeof event?.[ROUTE_PROPERTY] === 'string') {
		return
	}

	const route = event?.headers?.[ROUTE_HEADER]

	if (typeof route === 'string' && routeType(route) === 'rest') {
		return webRoute(route, event)
	}

	return
}
