import type { S3Event } from 'aws-lambda'
import { ROUTE_HEADER, ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher } from './types.js'
import { asyncRoute, routeType } from './util.js'

export const storeHandler: RouteMatcher<S3Event> = event => {
	if (typeof event?.[ROUTE_PROPERTY] === 'string' || typeof event?.headers?.[ROUTE_HEADER] === 'string') {
		return
	}

	const record = event?.Records?.[0]
	const route = record?.s3?.configurationId

	if (record?.eventSource === 'aws:s3' && typeof route === 'string' && routeType(route) === 'store') {
		return asyncRoute(route, event)
	}

	return
}
