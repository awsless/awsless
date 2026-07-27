import type { RouteMatcher } from './types.js'
import { asyncRoute, routeType } from './util.js'

export const taskHandler: RouteMatcher = event => {
	const route = event?.['$awsless-route']

	if (typeof route === 'string' && routeType(route) === 'task') {
		return asyncRoute(route, event.event)
	}

	return
}
