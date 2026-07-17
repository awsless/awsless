import type { SQSEvent } from 'aws-lambda'
import type { RouteMatcher } from './types.js'

export const queueHandler: RouteMatcher<SQSEvent> = event => {
	const route = event?.['$awsless-route']

	if (typeof route === 'string') {
		if (route.split(':')[1] === 'queue') {
			return {
				key: route,
				payload: event.event,
				expectedErrors: true,
			}
		}

		return
	}

	if (typeof event?.headers?.['x-awsless-route'] === 'string') {
		return
	}

	// Event source mappings tell us the source resource name, which maps directly to a route.
	const record = event?.Records?.[0]

	if (record?.eventSource === 'aws:sqs' && typeof record.eventSourceARN === 'string') {
		// Map a resource name like "app--stack--queue--id.fifo" back to the "stack:queue:id" route key.
		const resourceName = record.eventSourceARN.split(':').at(-1)!
		const route = resourceName
			.replace(/\.fifo$/, '')
			.slice(process.env.APP!.length + 2)
			.split('--')
			.join(':')

		if (route.split(':')[1] === 'queue') {
			return {
				key: route,
				payload: event,
				expectedErrors: true,
			}
		}
	}
}
