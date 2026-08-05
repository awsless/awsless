import { Duration } from '@awsless/duration'
import { Handler } from '@awsless/lambda'
import {
	array,
	date,
	GenericSchema,
	InferInput,
	literal,
	object,
	optional,
	snsTopic,
	string,
	unknown,
} from '@awsless/validate'
import { consumer } from './util.js'

// The response contract of the websocket authorizer: which topic
// patterns the connection may subscribe to & how long the session
// stays valid.
export type PubSubAuthResult =
	| {
			/** Allow the connection. */
			authorized: true

			/** The topic patterns the connection may subscribe to, like `"chat.*"`. */
			allowed: string[]

			/** Extra data attached to the connection, passed along on every lifecycle event. */
			context?: Record<string, unknown>

			/** How long the authorization stays cached before the authorizer runs again. */
			ttl?: Duration

			/**
			 * Close the connection after this duration, forcing the client
			 * to re-authenticate. Min 1 hour, max 1 week. Default: 1 day.
			 */
			disconnectAfter?: Duration
	  }
	| {
			/** Reject the connection. */
			authorized: false
	  }

const authEventSchema = object({
	token: optional(string()),
})

/** The event the pubsub authorizer receives. */
export type AuthEvent = {
	/** The auth token the client connected with - guest connections don't provide one. */
	token?: string
}

/** The contract the pubsub authorizer returns. */
export type AuthResponse = PubSubAuthResult

type AuthSchema = GenericSchema<InferInput<typeof authEventSchema>, AuthEvent>

export const auth = <H extends Handler<AuthSchema, PubSubAuthResult | Promise<PubSubAuthResult>>>(handle: H) => {
	return consumer(authEventSchema as AuthSchema, handle)
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

type LifecycleEvent<E extends string> = {
	/** The lifecycle event kind. */
	event: E

	/** The moment the event happened. */
	date: Date

	/** The unique id of the websocket connection. */
	socketId: string

	/** The ip address the client connected from. */
	ip: string

	/** The context the pubsub authorizer attached to the connection. */
	context?: unknown
}

/** The parsed event a connected handler receives. */
export type ConnectedEvent = LifecycleEvent<'connected'>

/** The parsed event a disconnected handler receives. */
export type DisconnectedEvent = LifecycleEvent<'disconnected'>

/** The parsed event a subscribed handler receives. */
export type SubscribedEvent = LifecycleEvent<'subscribed'> & {
	/** The topics the connection subscribed to. */
	topics: string[]
}

/** The parsed event an unsubscribed handler receives. */
export type UnsubscribedEvent = LifecycleEvent<'unsubscribed'> & {
	/** The topics the connection unsubscribed from. */
	topics: string[]
}

const connectedSchema = snsTopic(lifecycle('connected'))
const disconnectedSchema = snsTopic(lifecycle('disconnected'))
const subscribedSchema = snsTopic(lifecycleWithTopics('subscribed'))
const unsubscribedSchema = snsTopic(lifecycleWithTopics('unsubscribed'))

// The documented event types drive the handler typing, while the
// schemas stay the runtime source of truth - the casts fail to compile
// when the two drift apart.
type ConnectedSchema = GenericSchema<InferInput<typeof connectedSchema>, ConnectedEvent>
type DisconnectedSchema = GenericSchema<InferInput<typeof disconnectedSchema>, DisconnectedEvent>
type SubscribedSchema = GenericSchema<InferInput<typeof subscribedSchema>, SubscribedEvent>
type UnsubscribedSchema = GenericSchema<InferInput<typeof unsubscribedSchema>, UnsubscribedEvent>

export const connected = <H extends Handler<ConnectedSchema>>(handle: H) => {
	return consumer(connectedSchema as ConnectedSchema, handle)
}

export const disconnected = <H extends Handler<DisconnectedSchema>>(handle: H) => {
	return consumer(disconnectedSchema as DisconnectedSchema, handle)
}

export const subscribed = <H extends Handler<SubscribedSchema>>(handle: H) => {
	return consumer(subscribedSchema as SubscribedSchema, handle)
}

export const unsubscribed = <H extends Handler<UnsubscribedSchema>>(handle: H) => {
	return consumer(unsubscribedSchema as UnsubscribedSchema, handle)
}
