import type { LambdaFunctionURLEvent } from 'aws-lambda'
import type { RouteMatcher } from './types.js'
import { routeType, webRoute } from './util.js'

export const rpcHandler: RouteMatcher<LambdaFunctionURLEvent> = event => {
	const route = event?.['$awsless-route']

	if (typeof route === 'string') {
		if (routeType(route) === 'rpc') {
			return {
				key: route,
				payload: event.event,
			}
		}

		return
	}

	const requestRoute = event?.headers?.['x-awsless-route']

	if (typeof requestRoute === 'string' && routeType(requestRoute) === 'rpc') {
		return webRoute(requestRoute, event)
	}

	return
}
