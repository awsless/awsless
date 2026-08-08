import { ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher } from './types.js'
import { asyncRoute, routeType } from './util.js'

export const cronHandler: RouteMatcher = event => {
	const route = event?.[ROUTE_PROPERTY]

	if (typeof route === 'string' && routeType(route) === 'cron') {
		return asyncRoute(route, event.event)
	}

	return
}
