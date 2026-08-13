import type { SQSEvent } from 'aws-lambda'
import { ROUTE_HEADER, ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher } from './types.js'
import { asyncRoute, routeFromResourceName, routeType } from './util.js'

export const queueHandler: RouteMatcher<SQSEvent> = event => {
	if (typeof event?.[ROUTE_PROPERTY] === 'string' || typeof event?.headers?.[ROUTE_HEADER] === 'string') {
		return
	}

	// Event source mappings tell us the source resource name, which maps directly to a route.
	const record = event?.Records?.[0]

	if (record?.eventSource === 'aws:sqs' && typeof record.eventSourceARN === 'string') {
		const queueName = record.eventSourceARN.split(':').at(-1)!
		const route = routeFromResourceName(queueName.replace(/\.fifo$/, ''))

		if (routeType(route) === 'queue') {
			return asyncRoute(route, event)
		}
	}

	return
}
