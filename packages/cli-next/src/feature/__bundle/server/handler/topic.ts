import type { SNSEvent } from 'aws-lambda'
import type { RouteMatcher } from './types.js'

export const createTopicHandler = (topicSubscribers: ReadonlyMap<string, readonly string[]>): RouteMatcher<SNSEvent> => {
	return event => {
		const route = event?.['$awsless-route']

		if (typeof route === 'string') {
			if (route.split(':')[1] === 'topic') {
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

		// SNS events can't tell us the route, so we dispatch to every handler subscribed to the topic.
		const record = event?.Records?.[0]

		if (record?.EventSource !== 'aws:sns' || typeof record?.Sns?.TopicArn !== 'string') {
			return
		}

		const topicId = record.Sns.TopicArn.split(':').at(-1)!.split('--').at(-1)!
		const subscribers = topicSubscribers.get(topicId) ?? []

		if (!subscribers.length) {
			throw new Error(`Unknown bundle topic: ${topicId}`)
		}

		if (subscribers.length === 1) {
			return {
				key: subscribers[0]!,
				payload: event,
				expectedErrors: true,
			}
		}

		// Isolate subscribers in separate invocations so a hard failure in one can't block or retry the others.
		return {
			fanout: subscribers.map(key => ({
				key,
				payload: event,
			})),
		}
	}
}
