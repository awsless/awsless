import { ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher } from './types.js'
import { routeType } from './util.js'

export const functionHandler: RouteMatcher = event => {
	const route = event?.[ROUTE_PROPERTY]

	if (typeof route === 'string' && routeType(route) === 'function') {
		return {
			key: route,
			payload: event.event,
		}
	}

	return
}
