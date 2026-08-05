import { Duration } from '@awsless/duration'
import { invoke } from '@awsless/lambda'
import type { UUID } from 'node:crypto'
import { createProxy } from '../proxy.js'
import { bindGlobalResourceName } from './util.js'

export const getPubSubPublisherName = bindGlobalResourceName('pubsub-publisher')

export interface PubSubResources {}

export const PubSub: PubSubResources = /*@__PURE__*/ createProxy(name => {
	const functionName = getPubSubPublisherName(name)

	return {
		publish: async (topic: string, event: string, payload?: unknown) => {
			await invoke({
				name: functionName,
				type: 'Event',
				payload: {
					topic,
					event,
					payload,
				},
			})
		},
	}
})

export type PubSubAuthorizerResponse =
	| {
			authorized: true
			allowed: string[]
			context?: Record<string, unknown>
			ttl?: Duration
			// Close the connection after this duration,
			// forcing the client to re-authenticate.
			// Min 1 hour, max 1 week. Default: 1 day.
			disconnectAfter?: Duration
	  }
	| {
			authorized: false
	  }

export type PubSubAuthorizerEvent = {
	// Guest connections don't provide an auth token.
	token?: string
}

export type PubSubConnectedEvent = {
	event: 'connected'
	socketId: UUID
	ip: string
	context?: Record<string, unknown>
	date: Date
}

export type PubSubDisconnectedEvent = {
	event: 'disconnected'
	socketId: UUID
	ip: string
	context?: Record<string, unknown>
	date: Date
}

export type PubSubSubscribedEvent = {
	event: 'subscribed'
	socketId: UUID
	ip: string
	context?: Record<string, unknown>
	topics: string[]
	date: Date
}

export type PubSubUnsubscribedEvent = {
	event: 'unsubscribed'
	socketId: UUID
	ip: string
	context?: Record<string, unknown>
	topics: string[]
	date: Date
}
