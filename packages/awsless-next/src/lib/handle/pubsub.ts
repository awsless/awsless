import { Duration } from '@awsless/duration'
import { Handler } from '@awsless/lambda'
import { array, date, InferOutput, literal, object, optional, snsTopic, string, unknown } from '@awsless/validate'
import { consumer } from './util.js'

// The response contract of the websocket authorizer: which topic
// patterns the connection may subscribe to & how long the session
// stays valid.
export type PubSubAuthResult =
	| {
			authorized: true
			allowed: string[]
			context?: Record<string, unknown>
			ttl?: Duration
			disconnectAfter?: Duration
	  }
	| {
			authorized: false
	  }

const authEventSchema = object({
	token: optional(string()),
})

export const auth = <H extends Handler<typeof authEventSchema, PubSubAuthResult | Promise<PubSubAuthResult>>>(
	handle: H
) => {
	return consumer(authEventSchema, handle)
}

// The lifecycle payloads the websocket server publishes. Only the
// subscribe events carry the affected topics - a connect knows none.
const lifecycle = <E extends string>(event: E) => {
	return object({
		event: literal(event),
		date: date(),
		socketId: string(),
		ip: string(),
		context: optional(unknown()),
	})
}

const lifecycleWithTopics = <E extends string>(event: E) => {
	return object({
		event: literal(event),
		date: date(),
		socketId: string(),
		ip: string(),
		context: optional(unknown()),
		topics: array(string()),
	})
}

const connectedSchema = snsTopic(lifecycle('connected'))
const disconnectedSchema = snsTopic(lifecycle('disconnected'))
const subscribedSchema = snsTopic(lifecycleWithTopics('subscribed'))
const unsubscribedSchema = snsTopic(lifecycleWithTopics('unsubscribed'))

// The parsed events & the authorizer contract of the handlers.
export type ConnectedEvent = InferOutput<typeof connectedSchema>
export type DisconnectedEvent = InferOutput<typeof disconnectedSchema>
export type SubscribedEvent = InferOutput<typeof subscribedSchema>
export type UnsubscribedEvent = InferOutput<typeof unsubscribedSchema>
export type AuthEvent = InferOutput<typeof authEventSchema>
export type AuthResponse = PubSubAuthResult

export const connected = <H extends Handler<typeof connectedSchema>>(handle: H) => {
	return consumer(connectedSchema, handle)
}

export const disconnected = <H extends Handler<typeof disconnectedSchema>>(handle: H) => {
	return consumer(disconnectedSchema, handle)
}

export const subscribed = <H extends Handler<typeof subscribedSchema>>(handle: H) => {
	return consumer(subscribedSchema, handle)
}

export const unsubscribed = <H extends Handler<typeof unsubscribedSchema>>(handle: H) => {
	return consumer(unsubscribedSchema, handle)
}
