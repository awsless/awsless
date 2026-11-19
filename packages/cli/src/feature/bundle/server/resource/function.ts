import { ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher } from './types.js'
import { invokedRoute, routeType } from './util.js'

export const functionHandler: RouteMatcher = event => {
	const route = event?.[ROUTE_PROPERTY]

	if (typeof route === 'string' && routeType(route) === 'function') {
		return invokedRoute(route, event.event)
	}

	return
}
