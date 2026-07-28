import { Duration } from '@awsless/duration'
import { invoke } from '@awsless/lambda'
import type { UUID } from 'node:crypto'
import { createProxy } from '../proxy.js'
import {
	getBundleName,
	BUNDLE_QUALIFIER,
	formatRouteKey,
	formatRoutePayload,
	getCurrentRoute,
	invokeRoute,
} from './bundle.js'
import { APP, bindGlobalResourceName, IS_TEST } from './util.js'

export const getPubSubPublisherName = bindGlobalResourceName('pubsub-publisher')

export interface PubSubResources {}

export const PubSub: PubSubResources = /*@__PURE__*/ createProxy(name => {
	const routeKey = formatRouteKey(APP, 'pubsub', `${name}-publisher`)

	return {
		publish: async (topic: string, event: string, payload?: unknown) => {
			const message = { topic, event, payload }

			// In tests we keep invoking the per-publisher name
			// so that the pubsub mocks keep working.
			if (IS_TEST) {
				await invoke({
					name: getPubSubPublisherName(name),
					type: 'Event',
					payload: message,
				})
				return
			}

			// Inside the bundle we dispatch in-process instead of self-invoking.
			if (getCurrentRoute()) {
				await invokeRoute(routeKey, message)
				return
			}

			await invoke({
				name: getBundleName(),
				qualifier: process.env.AWS_LAMBDA_FUNCTION_VERSION ?? BUNDLE_QUALIFIER,
				type: 'Event',
				payload: formatRoutePayload(routeKey, message),
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
