import type { S3Event } from 'aws-lambda'
import { ROUTE_HEADER, ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher, RouteSpan } from './types.js'
import { asyncRoute, getOldestAge, routeType } from './util.js'

// The bucket and the kinds of events, never an object's key.
const describeStoreSpan = (event: Partial<S3Event>): RouteSpan => {
	const records = event.Records ?? []

	return {
		trigger: 's3',
		metadata: {
			bucket: records[0]?.s3?.bucket?.name ?? 'unknown',
			records: records.length,
			events: [...new Set(records.map(record => record.eventName))].join(','),
			...getOldestAge(
				'oldest_event_age_ms',
				records.map(record => Date.parse(record.eventTime))
			),
		},
	}
}

export const storeHandler: RouteMatcher<S3Event> = event => {
	if (typeof event?.[ROUTE_PROPERTY] === 'string' || typeof event?.headers?.[ROUTE_HEADER] === 'string') {
		return
	}

	const record = event?.Records?.[0]
	const route = record?.s3?.configurationId

	if (record?.eventSource === 'aws:s3' && typeof route === 'string' && routeType(route) === 'store') {
		return asyncRoute(route, event, () => describeStoreSpan(event))
	}

	return
}
