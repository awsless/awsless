import type { RouteMatcher } from './types.js'

export const functionHandler: RouteMatcher = event => {
	const route = event?.['$awsless-route']

	if (typeof route === 'string' && route.split(':')[1] === 'function') {
		return {
			key: route,
			payload: event.event,
		}
	}
}
