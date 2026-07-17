import type { RouteMatcher } from './types.js'
import { asyncRoute } from './util.js'

export const taskHandler: RouteMatcher = event => {
	const route = event?.['$awsless-route']

	if (typeof route === 'string' && route.split(':')[1] === 'task') {
		return asyncRoute(route, event.event)
	}

	return
}
