import type { SNSEvent } from 'aws-lambda'
import type { RouteMatcher } from './types.js'
import { asyncRoute, routeType } from './util.js'

export const topicHandler: RouteMatcher<SNSEvent> = (event, routes) => {
	const route = event?.['$awsless-route']

	if (typeof route === 'string') {
		if (routeType(route) === 'topic') {
			return asyncRoute(route, event.event)
		}

		return
	}

	if (typeof event?.headers?.['x-awsless-route'] === 'string') {
		return
	}

	// SNS events can't tell us the route, so we dispatch to every handler subscribed to the topic.
	const record = event?.Records?.[0]

	if (record?.EventSource !== 'aws:sns' || typeof record?.Sns?.TopicArn !== 'string') {
		return
	}

	const topicName = record.Sns.TopicArn.split(':').at(-1)!
	const [, resourceType, topicId] = topicName.split('--')

	// Other features publish to their own topics, like the pubsub events topic,
	// so we only claim the events of a topic resource.
	if (resourceType !== 'topic') {
		return
	}

	const subscribers = routes.filter(route => {
		const [, type, id] = route.split(':')

		return type === 'topic' && id === topicId
	})

	if (!subscribers.length) {
		throw new Error(`Unknown bundle topic: ${topicId}`)
	}

	if (subscribers.length === 1) {
		return asyncRoute(subscribers[0]!, event)
	}

	// Isolate subscribers in separate invocations so a hard failure in one can't block or retry the others.
	return subscribers.map(key => ({ key, payload: event }))
}
