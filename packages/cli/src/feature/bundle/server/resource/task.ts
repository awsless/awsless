import { ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher } from './types.js'
import { asyncRoute, routeType } from './util.js'

export const taskHandler: RouteMatcher = event => {
	const route = event?.[ROUTE_PROPERTY]

	if (typeof route === 'string' && routeType(route) === 'task') {
		// A task is invoked async, at once or by a schedule.
		return asyncRoute(route, event.event, () => ({ trigger: 'async-invoke' }))
	}

	return
}
