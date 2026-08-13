import type { SNSEvent } from 'aws-lambda'
import { ROUTE_HEADER, ROUTE_PROPERTY } from 'awsless'
import type { RouteMatcher } from './types.js'
import { asyncRoute, routeType } from './util.js'

const eventTypes = ['connected', 'disconnected', 'subscribed', 'unsubscribed']

export const pubsubHandler: RouteMatcher<SNSEvent> = (event, routes) => {
	const route = event?.[ROUTE_PROPERTY]

	if (typeof route === 'string') {
		if (routeType(route) === 'pubsub') {
			// Event listener routes retry & reach the on-failure destination,
			// while the auth & publisher routes respond to their caller.
			if (eventTypes.some(type => route.endsWith(`-${type}`))) {
				return asyncRoute(route, event.event)
			}

			return {
				key: route,
				payload: event.event,
			}
		}

		return
	}

	if (typeof event?.headers?.[ROUTE_HEADER] === 'string') {
		return
	}

	// The pubsub server publishes the socket events to SNS.
	const record = event?.Records?.[0]

	if (record?.EventSource !== 'aws:sns' || typeof record?.Sns?.TopicArn !== 'string') {
		return
	}

	const topicName = record.Sns.TopicArn.split(':').at(-1)!
	const [, resourceType, pubsubId] = topicName.split('--')

	if (resourceType !== 'pubsub-events') {
		return
	}

	const eventType = record.Sns.MessageAttributes?.event?.Value
	const listeners = routes.filter(route => {
		const [, type, id] = route.split(':')

		return type === 'pubsub' && id === `${pubsubId}-${eventType}`
	})

	if (!listeners.length) {
		throw new Error(`Unknown bundle pubsub event: ${pubsubId}-${eventType}`)
	}

	if (listeners.length === 1) {
		return asyncRoute(listeners[0]!, event)
	}

	// Isolate listeners in separate invocations so a hard failure in one can't block or retry the others.
	return listeners.map(key => ({ key, payload: event }))
}
