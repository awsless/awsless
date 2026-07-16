import type { RouteMatcher } from './types.js'

export const taskHandler: RouteMatcher = event => {
	const route = event?.['$awsless-route']

	if (typeof route === 'string' && route.split(':')[1] === 'task') {
		return {
			key: route,
			payload: event.event,
			expectedErrors: true,
		}
	}
}
