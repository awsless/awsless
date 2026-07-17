import type { RouteMatcher } from './types.js'
import { asyncRoute } from './util.js'

export const cronHandler: RouteMatcher = event => {
	const route = event?.['$awsless-route']

	if (typeof route === 'string' && route.split(':')[1] === 'cron') {
		return asyncRoute(route, event.event)
	}

	return
}
