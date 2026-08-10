import { Duration } from '@awsless/duration';
import { Handler } from '@awsless/lambda';
import { GenericSchema, InferInput, InferOutput } from '@awsless/validate';
import { consumer } from './util.js';
export type PubSubAuthResult = {
    /** Allow the connection. */
    authorized: true;
    /** The topic patterns the connection may subscribe to, like `"chat.*"`. */
    allowed: string[];
    /** Extra data attached to the connection, passed along on every lifecycle event. */
    context?: Record<string, unknown>;
    /** How long the authorization stays cached before the authorizer runs again. */
    ttl?: Duration;
    /**
     * Close the connection after this duration, forcing the client
     * to re-authenticate. Min 1 hour, max 1 week. Default: 1 day.
     */
    disconnectAfter?: Duration;
} | {
    /** Reject the connection. */
    authorized: false;
};
declare const authEventSchema: import("valibot").ObjectSchema<{
    readonly token: import("valibot").OptionalSchema<import("valibot").StringSchema<undefined>, undefined>;
}, undefined>;
/** The event the pubsub authorizer receives. */
export type AuthEvent = {
    /** The auth token the client connected with - guest connections don't provide one. */
    token?: string;
};
/** The contract the pubsub authorizer returns. */
export type AuthResponse = PubSubAuthResult;
type AuthSchema = GenericSchema<InferInput<typeof authEventSchema>, AuthEvent>;
export declare const auth: <H extends Handler<AuthSchema, PubSubAuthResult | Promise<PubSubAuthResult>>>(handle: H) => (event: {
    token?: string | undefined;
}, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
type LifecycleEvent<E extends string, C = unknown> = {
    /** The lifecycle event kind. */
    event: E;
    /** The moment the event happened. */
    date: Date;
    /** The unique id of the websocket connection. */
    socketId: string;
    /** The ip address the client connected from. */
    ip: string;
    /** The context the pubsub authorizer attached to the connection. */
    context?: C;
};
/** The parsed event a connected handler receives. */
export type ConnectedEvent<C = unknown> = LifecycleEvent<'connected', C>;
/** The parsed event a disconnected handler receives. */
export type DisconnectedEvent<C = unknown> = LifecycleEvent<'disconnected', C>;
/** The parsed event a subscribed handler receives. */
export type SubscribedEvent<C = unknown> = LifecycleEvent<'subscribed', C> & {
    /** The topics the connection subscribed to. */
    topics: string[];
};
/** The parsed event an unsubscribed handler receives. */
export type UnsubscribedEvent<C = unknown> = LifecycleEvent<'unsubscribed', C> & {
    /** The topics the connection unsubscribed from. */
    topics: string[];
};
declare const connectedSchema: import("@awsless/validate").SnsTopicSchema<import("valibot").ObjectSchema<{
    readonly event: import("valibot").LiteralSchema<"connected", undefined>;
    readonly date: import("valibot").DateSchema<undefined>;
    readonly socketId: import("valibot").StringSchema<undefined>;
    readonly ip: import("valibot").StringSchema<undefined>;
    readonly context: import("valibot").OptionalSchema<GenericSchema, undefined>;
}, undefined>>;
declare const disconnectedSchema: import("@awsless/validate").SnsTopicSchema<import("valibot").ObjectSchema<{
    readonly event: import("valibot").LiteralSchema<"disconnected", undefined>;
    readonly date: import("valibot").DateSchema<undefined>;
    readonly socketId: import("valibot").StringSchema<undefined>;
    readonly ip: import("valibot").StringSchema<undefined>;
    readonly context: import("valibot").OptionalSchema<GenericSchema, undefined>;
}, undefined>>;
declare const subscribedSchema: import("@awsless/validate").SnsTopicSchema<import("valibot").ObjectSchema<{
    readonly event: import("valibot").LiteralSchema<"subscribed", undefined>;
    readonly date: import("valibot").DateSchema<undefined>;
    readonly socketId: import("valibot").StringSchema<undefined>;
    readonly ip: import("valibot").StringSchema<undefined>;
    readonly context: import("valibot").OptionalSchema<GenericSchema, undefined>;
    readonly topics: import("valibot").ArraySchema<import("valibot").StringSchema<undefined>, undefined>;
}, undefined>>;
declare const unsubscribedSchema: import("@awsless/validate").SnsTopicSchema<import("valibot").ObjectSchema<{
    readonly event: import("valibot").LiteralSchema<"unsubscribed", undefined>;
    readonly date: import("valibot").DateSchema<undefined>;
    readonly socketId: import("valibot").StringSchema<undefined>;
    readonly ip: import("valibot").StringSchema<undefined>;
    readonly context: import("valibot").OptionalSchema<GenericSchema, undefined>;
    readonly topics: import("valibot").ArraySchema<import("valibot").StringSchema<undefined>, undefined>;
}, undefined>>;
type ConnectedSchema<C = unknown> = GenericSchema<InferInput<typeof connectedSchema>, ConnectedEvent<C>>;
type DisconnectedSchema<C = unknown> = GenericSchema<InferInput<typeof disconnectedSchema>, DisconnectedEvent<C>>;
type SubscribedSchema<C = unknown> = GenericSchema<InferInput<typeof subscribedSchema>, SubscribedEvent<C>>;
type UnsubscribedSchema<C = unknown> = GenericSchema<InferInput<typeof unsubscribedSchema>, UnsubscribedEvent<C>>;
export declare function connected<H extends Handler<ConnectedSchema>>(handle: H): ReturnType<typeof consumer>;
export declare function connected<C extends GenericSchema, H extends Handler<ConnectedSchema<InferOutput<C>>>>(context: C, handle: H): ReturnType<typeof consumer>;
export declare function disconnected<H extends Handler<DisconnectedSchema>>(handle: H): ReturnType<typeof consumer>;
export declare function disconnected<C extends GenericSchema, H extends Handler<DisconnectedSchema<InferOutput<C>>>>(context: C, handle: H): ReturnType<typeof consumer>;
export declare function subscribed<H extends Handler<SubscribedSchema>>(handle: H): ReturnType<typeof consumer>;
export declare function subscribed<C extends GenericSchema, H extends Handler<SubscribedSchema<InferOutput<C>>>>(context: C, handle: H): ReturnType<typeof consumer>;
export declare function unsubscribed<H extends Handler<UnsubscribedSchema>>(handle: H): ReturnType<typeof consumer>;
export declare function unsubscribed<C extends GenericSchema, H extends Handler<UnsubscribedSchema<InferOutput<C>>>>(context: C, handle: H): ReturnType<typeof consumer>;
export {};
