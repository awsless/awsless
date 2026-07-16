import type { LambdaFunctionURLEvent } from 'aws-lambda'
import type { RouteMatcher } from './types.js'

export const imageHandler: RouteMatcher<LambdaFunctionURLEvent> = event => {
	const route = event?.['$awsless-route']

	if (typeof route === 'string') {
		if (route.split(':')[1] === 'image') {
			return {
				key: route,
				payload: event.event,
			}
		}

		return
	}

	const requestRoute = event?.headers?.['x-awsless-route']

	if (typeof requestRoute === 'string' && requestRoute.split(':')[1] === 'image') {
		return {
			key: requestRoute,
			payload: event,
		}
	}
}
