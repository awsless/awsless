import { ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher } from './types.js'
import { asyncRoute, routeType } from './util.js'

// The on-failure consumer only runs as a bundle route on the local dev
// worker - deployed apps run it as a stand-alone lambda.
export const onFailureHandler: RouteMatcher = event => {
	const route = event?.[ROUTE_PROPERTY]

	if (typeof route === 'string' && routeType(route) === 'on-failure') {
		return asyncRoute(route, event.event)
	}

	return
}
