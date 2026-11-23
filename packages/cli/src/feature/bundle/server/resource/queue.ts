import type { SQSEvent } from 'aws-lambda'
import { ROUTE_HEADER, ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher, RouteSpan } from './types.js'
import { asyncRoute, getOldestAge, routeFromResourceName, routeType } from './util.js'

// A batch's size, retries and how long its oldest message waited.
const describeQueueSpan = (event: Partial<SQSEvent>): RouteSpan => {
	const records = event.Records ?? []
	const maxReceiveCount = Math.max(
		1,
		...records.map(record => Number(record.attributes?.ApproximateReceiveCount ?? 1))
	)

	return {
		trigger: 'sqs',
		// A batch with a message on its second or later try.
		annotations: { retried: maxReceiveCount > 1 },
		metadata: {
			queue: records[0]?.eventSourceARN?.split(':').at(-1) ?? 'unknown',
			messages: records.length,
			max_receive_count: maxReceiveCount,
			...getOldestAge(
				'oldest_message_age_ms',
				records.map(record => Number(record.attributes?.SentTimestamp))
			),
		},
	}
}

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
			return asyncRoute(route, event, () => describeQueueSpan(event))
		}
	}

	return
}
