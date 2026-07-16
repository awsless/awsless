import type { S3Event } from 'aws-lambda'
import type { RouteMatcher } from './types.js'

export const storeHandler: RouteMatcher<S3Event> = event => {
	const requestedRoute = event?.['$awsless-route']

	if (typeof requestedRoute === 'string') {
		if (requestedRoute.split(':')[1] === 'store') {
			return {
				key: requestedRoute,
				payload: event.event,
				expectedErrors: true,
			}
		}

		return
	}

	if (typeof event?.headers?.['x-awsless-route'] === 'string') {
		return
	}

	const record = event?.Records?.[0]
	const route = record?.s3?.configurationId

	if (record?.eventSource === 'aws:s3' && typeof route === 'string' && route.split(':')[1] === 'store') {
		return {
			key: route,
			payload: event,
			expectedErrors: true,
		}
	}
}
