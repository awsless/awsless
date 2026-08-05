import type { RouteMatcher } from './types.js'
import { asyncRoute, routeType } from './util.js'

export const onFailureHandler: RouteMatcher = event => {
	const route = event?.['$awsless-route']

	if (typeof route === 'string' && routeType(route) === 'on-failure') {
		return asyncRoute(route, event.event)
	}

	return
}
