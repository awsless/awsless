import { stringify } from '@awsless/json'
import { publish } from '@awsless/sns'
import type { UUID } from 'node:crypto'

type EventType = 'connected' | 'disconnected' | 'subscribed' | 'unsubscribed'

export const publishEvent = (
	event: EventType,
	payload: {
		socketId: UUID
		ip: string
		context?: Record<string, unknown>
		topics?: string[]
	}
) => {
	const topic = process.env.EVENTS_TOPIC

	if (!topic) {
		return
	}

	// Fire-and-forget, so that the socket path is never blocked.
	// The event message attribute is used by the listener filter policies.

	publish({
		topic,
		payload: stringify({
			event,
			date: new Date(),
			...payload,
		}),
		attributes: {
			event,
		},
	}).catch(error => {
		console.error('Failed to publish socket event', error)
	})
}
