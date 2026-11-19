import type { SNSEvent } from 'aws-lambda'
import { kebabCase } from 'change-case'
import type { BundleEvent, RouteMatch, RouteSpan } from './types.js'

// Route keys follow the "scope:type:name" format.
export const routeType = (route: string) => {
	return route.split(':')[1]
}

// Map a physical resource name like "app--stack--queue--id" back to the "stack:queue:id" route key.
export const routeFromResourceName = (name: string) => {
	return name
		.slice(kebabCase(process.env.APP!).length + 2)
		.split('--')
		.join(':')
}

// Async event handlers must throw expected errors, so failed invocations retry & reach the on-failure destination.
export const asyncRoute = (key: string, payload: unknown, describeSpan?: () => RouteSpan): RouteMatch => {
	return { key, payload, throwExpectedErrors: true, describeSpan }
}

// A route another function invokes with its payload.
export const invokedRoute = (key: string, payload: unknown): RouteMatch => {
	return { key, payload, describeSpan: () => ({ trigger: 'invoke' }) }
}

// How long ago the oldest of the times was, in milliseconds, as a span's metadata.
export const getOldestAge = (key: string, times: number[]): Record<string, number> => {
	const valid = times.filter(time => Number.isFinite(time))

	if (!valid.length) {
		return {}
	}

	return { [key]: Math.max(0, Date.now() - Math.min(...valid)) }
}

// The cloudfront OAC signing claims the authorization header,
// so the router tunnels the viewer authorization in a custom header that we restore here.
export const webRoute = (key: string, event: BundleEvent): RouteMatch => {
	const authorization = event.headers?.['x-awsless-authorization']

	if (typeof authorization === 'string') {
		event.headers!.authorization = authorization
		delete event.headers!['x-awsless-authorization']
	}

	return {
		key,
		payload: event,
		// The method alone: a url can hold ids and emails.
		describeSpan: () => {
			const method = (event as { requestContext?: { http?: { method?: unknown } } }).requestContext?.http?.method

			return { trigger: 'http', http: typeof method === 'string' ? { method } : undefined }
		},
	}
}

// An SNS delivery's topic, size and age, for the topic and pubsub routes; a
// payload that isn't one (a route invoked by hand) is only named.
export const describeSnsSpan = (event: unknown): RouteSpan => {
	const records = (event as Partial<SNSEvent> | undefined)?.Records

	if (!Array.isArray(records)) {
		return { trigger: 'sns' }
	}

	const message = records[0]?.Sns
	const pubsubEvent = message?.MessageAttributes?.event?.Value

	return {
		trigger: 'sns',
		metadata: {
			topic: message?.TopicArn?.split(':').at(-1) ?? 'unknown',
			messages: records.length,
			...(message?.MessageId ? { message_id: message.MessageId } : {}),
			...(pubsubEvent ? { pubsub_event: pubsubEvent } : {}),
			...getOldestAge(
				'oldest_message_age_ms',
				records.map(record => Date.parse(record.Sns?.Timestamp))
			),
		},
	}
}
