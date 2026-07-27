import type { S3Event } from 'aws-lambda'
import type { RouteMatcher } from './types.js'
import { asyncRoute, routeType } from './util.js'

export const storeHandler: RouteMatcher<S3Event> = event => {
	const requestedRoute = event?.['$awsless-route']

	if (typeof requestedRoute === 'string') {
		if (routeType(requestedRoute) === 'store') {
			return asyncRoute(requestedRoute, event.event)
		}

		return
	}

	if (typeof event?.headers?.['x-awsless-route'] === 'string') {
		return
	}

	const record = event?.Records?.[0]
	const route = record?.s3?.configurationId

	if (record?.eventSource === 'aws:s3' && typeof route === 'string' && routeType(route) === 'store') {
		return asyncRoute(route, event)
	}

	return
}
