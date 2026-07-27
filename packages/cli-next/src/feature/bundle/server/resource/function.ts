import type { RouteMatcher } from './types.js'
import { routeType } from './util.js'

export const functionHandler: RouteMatcher = event => {
	const route = event?.['$awsless-route']

	if (typeof route === 'string' && routeType(route) === 'function') {
		return {
			key: route,
			payload: event.event,
		}
	}

	return
}
