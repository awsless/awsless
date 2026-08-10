import { Duration } from '@awsless/duration'
import { Handler } from '@awsless/lambda'
import {
	array,
	date,
	GenericSchema,
	InferInput,
	InferOutput,
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
// The context validates against the given schema when the handle
// passes one, & stays unknown otherwise.
const lifecycle = <E extends string>(event: E, context: GenericSchema = unknown()) => {
	return object({
		event: literal(event),
		date: date(),
		socketId: string(),
		ip: string(),
		context: optional(context),
	})
}

const lifecycleWithTopics = <E extends string>(event: E, context: GenericSchema = unknown()) => {
	return object({
		event: literal(event),
		date: date(),
		socketId: string(),
		ip: string(),
		context: optional(context),
		topics: array(string()),
	})
}

type LifecycleEvent<E extends string, C = unknown> = {
	/** The lifecycle event kind. */
	event: E

	/** The moment the event happened. */
	date: Date

	/** The unique id of the websocket connection. */
	socketId: string

	/** The ip address the client connected from. */
	ip: string

	/** The context the pubsub authorizer attached to the connection. */
	context?: C
}

/** The parsed event a connected handler receives. */
export type ConnectedEvent<C = unknown> = LifecycleEvent<'connected', C>

/** The parsed event a disconnected handler receives. */
export type DisconnectedEvent<C = unknown> = LifecycleEvent<'disconnected', C>

/** The parsed event a subscribed handler receives. */
export type SubscribedEvent<C = unknown> = LifecycleEvent<'subscribed', C> & {
	/** The topics the connection subscribed to. */
	topics: string[]
}

/** The parsed event an unsubscribed handler receives. */
export type UnsubscribedEvent<C = unknown> = LifecycleEvent<'unsubscribed', C> & {
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
type ConnectedSchema<C = unknown> = GenericSchema<InferInput<typeof connectedSchema>, ConnectedEvent<C>>
type DisconnectedSchema<C = unknown> = GenericSchema<InferInput<typeof disconnectedSchema>, DisconnectedEvent<C>>
type SubscribedSchema<C = unknown> = GenericSchema<InferInput<typeof subscribedSchema>, SubscribedEvent<C>>
type UnsubscribedSchema<C = unknown> = GenericSchema<InferInput<typeof unsubscribedSchema>, UnsubscribedEvent<C>>

// Every lifecycle handle optionally takes the schema of the context
// the authorizer attaches, so the handler receives it fully typed &
// validated instead of unknown.
const lifecycleHandle = (base: GenericSchema, build: (context: GenericSchema) => GenericSchema) => {
	return (contextOrHandle: GenericSchema | Handler<GenericSchema>, maybeHandle?: Handler<GenericSchema>) => {
		const withContext = typeof maybeHandle === 'function'
		const handle = withContext ? maybeHandle : (contextOrHandle as Handler<GenericSchema>)
		const schema = withContext ? build(contextOrHandle as GenericSchema) : base

		return consumer(schema, handle)
	}
}

export function connected<H extends Handler<ConnectedSchema>>(handle: H): ReturnType<typeof consumer>
export function connected<C extends GenericSchema, H extends Handler<ConnectedSchema<InferOutput<C>>>>(
	context: C,
	handle: H
): ReturnType<typeof consumer>
export function connected(...args: [GenericSchema | Handler<GenericSchema>, Handler<GenericSchema>?]) {
	return lifecycleHandle(connectedSchema, context => snsTopic(lifecycle('connected', context)))(...args)
}

export function disconnected<H extends Handler<DisconnectedSchema>>(handle: H): ReturnType<typeof consumer>
export function disconnected<C extends GenericSchema, H extends Handler<DisconnectedSchema<InferOutput<C>>>>(
	context: C,
	handle: H
): ReturnType<typeof consumer>
export function disconnected(...args: [GenericSchema | Handler<GenericSchema>, Handler<GenericSchema>?]) {
	return lifecycleHandle(disconnectedSchema, context => snsTopic(lifecycle('disconnected', context)))(...args)
}

export function subscribed<H extends Handler<SubscribedSchema>>(handle: H): ReturnType<typeof consumer>
export function subscribed<C extends GenericSchema, H extends Handler<SubscribedSchema<InferOutput<C>>>>(
	context: C,
	handle: H
): ReturnType<typeof consumer>
export function subscribed(...args: [GenericSchema | Handler<GenericSchema>, Handler<GenericSchema>?]) {
	return lifecycleHandle(subscribedSchema, context => snsTopic(lifecycleWithTopics('subscribed', context)))(...args)
}

export function unsubscribed<H extends Handler<UnsubscribedSchema>>(handle: H): ReturnType<typeof consumer>
export function unsubscribed<C extends GenericSchema, H extends Handler<UnsubscribedSchema<InferOutput<C>>>>(
	context: C,
	handle: H
): ReturnType<typeof consumer>
export function unsubscribed(...args: [GenericSchema | Handler<GenericSchema>, Handler<GenericSchema>?]) {
	return lifecycleHandle(unsubscribedSchema, context => snsTopic(lifecycleWithTopics('unsubscribed', context)))(
		...args
	)
}
