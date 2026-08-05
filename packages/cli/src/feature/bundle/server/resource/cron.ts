import type { RouteMatcher } from './types.js'
import { asyncRoute, routeType } from './util.js'

export const cronHandler: RouteMatcher = event => {
	const route = event?.['$awsless-route']

	if (typeof route === 'string' && routeType(route) === 'cron') {
		return asyncRoute(route, event.event)
	}

	return
}
