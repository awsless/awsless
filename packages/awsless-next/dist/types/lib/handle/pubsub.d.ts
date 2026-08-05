import { Duration } from '@awsless/duration';
import { Handler } from '@awsless/lambda';
import { GenericSchema, InferInput } from '@awsless/validate';
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
type LifecycleEvent<E extends string> = {
    /** The lifecycle event kind. */
    event: E;
    /** The moment the event happened. */
    date: Date;
    /** The unique id of the websocket connection. */
    socketId: string;
    /** The ip address the client connected from. */
    ip: string;
    /** The context the pubsub authorizer attached to the connection. */
    context?: unknown;
};
/** The parsed event a connected handler receives. */
export type ConnectedEvent = LifecycleEvent<'connected'>;
/** The parsed event a disconnected handler receives. */
export type DisconnectedEvent = LifecycleEvent<'disconnected'>;
/** The parsed event a subscribed handler receives. */
export type SubscribedEvent = LifecycleEvent<'subscribed'> & {
    /** The topics the connection subscribed to. */
    topics: string[];
};
/** The parsed event an unsubscribed handler receives. */
export type UnsubscribedEvent = LifecycleEvent<'unsubscribed'> & {
    /** The topics the connection unsubscribed from. */
    topics: string[];
};
declare const connectedSchema: import("@awsless/validate").SnsTopicSchema<import("valibot").ObjectSchema<{
    readonly event: import("valibot").LiteralSchema<"connected", undefined>;
    readonly date: import("valibot").DateSchema<undefined>;
    readonly socketId: import("valibot").StringSchema<undefined>;
    readonly ip: import("valibot").StringSchema<undefined>;
    readonly context: import("valibot").OptionalSchema<import("valibot").UnknownSchema, undefined>;
}, undefined>>;
declare const disconnectedSchema: import("@awsless/validate").SnsTopicSchema<import("valibot").ObjectSchema<{
    readonly event: import("valibot").LiteralSchema<"disconnected", undefined>;
    readonly date: import("valibot").DateSchema<undefined>;
    readonly socketId: import("valibot").StringSchema<undefined>;
    readonly ip: import("valibot").StringSchema<undefined>;
    readonly context: import("valibot").OptionalSchema<import("valibot").UnknownSchema, undefined>;
}, undefined>>;
declare const subscribedSchema: import("@awsless/validate").SnsTopicSchema<import("valibot").ObjectSchema<{
    readonly event: import("valibot").LiteralSchema<"subscribed", undefined>;
    readonly date: import("valibot").DateSchema<undefined>;
    readonly socketId: import("valibot").StringSchema<undefined>;
    readonly ip: import("valibot").StringSchema<undefined>;
    readonly context: import("valibot").OptionalSchema<import("valibot").UnknownSchema, undefined>;
    readonly topics: import("valibot").ArraySchema<import("valibot").StringSchema<undefined>, undefined>;
}, undefined>>;
declare const unsubscribedSchema: import("@awsless/validate").SnsTopicSchema<import("valibot").ObjectSchema<{
    readonly event: import("valibot").LiteralSchema<"unsubscribed", undefined>;
    readonly date: import("valibot").DateSchema<undefined>;
    readonly socketId: import("valibot").StringSchema<undefined>;
    readonly ip: import("valibot").StringSchema<undefined>;
    readonly context: import("valibot").OptionalSchema<import("valibot").UnknownSchema, undefined>;
    readonly topics: import("valibot").ArraySchema<import("valibot").StringSchema<undefined>, undefined>;
}, undefined>>;
type ConnectedSchema = GenericSchema<InferInput<typeof connectedSchema>, ConnectedEvent>;
type DisconnectedSchema = GenericSchema<InferInput<typeof disconnectedSchema>, DisconnectedEvent>;
type SubscribedSchema = GenericSchema<InferInput<typeof subscribedSchema>, SubscribedEvent>;
type UnsubscribedSchema = GenericSchema<InferInput<typeof unsubscribedSchema>, UnsubscribedEvent>;
export declare const connected: <H extends Handler<ConnectedSchema>>(handle: H) => (event: {
    event: "connected";
    date: Date;
    socketId: string;
    ip: string;
    context?: unknown;
} | {
    Records: {
        Sns: {
            Message: string | {
                event: "connected";
                date: Date;
                socketId: string;
                ip: string;
                context?: unknown;
            };
        };
    }[];
}, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
export declare const disconnected: <H extends Handler<DisconnectedSchema>>(handle: H) => (event: {
    event: "disconnected";
    date: Date;
    socketId: string;
    ip: string;
    context?: unknown;
} | {
    Records: {
        Sns: {
            Message: string | {
                event: "disconnected";
                date: Date;
                socketId: string;
                ip: string;
                context?: unknown;
            };
        };
    }[];
}, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
export declare const subscribed: <H extends Handler<SubscribedSchema>>(handle: H) => (event: {
    event: "subscribed";
    date: Date;
    socketId: string;
    ip: string;
    context?: unknown;
    topics: string[];
} | {
    Records: {
        Sns: {
            Message: string | {
                event: "subscribed";
                date: Date;
                socketId: string;
                ip: string;
                context?: unknown;
                topics: string[];
            };
        };
    }[];
}, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
export declare const unsubscribed: <H extends Handler<UnsubscribedSchema>>(handle: H) => (event: {
    event: "unsubscribed";
    date: Date;
    socketId: string;
    ip: string;
    context?: unknown;
    topics: string[];
} | {
    Records: {
        Sns: {
            Message: string | {
                event: "unsubscribed";
                date: Date;
                socketId: string;
                ip: string;
                context?: unknown;
                topics: string[];
            };
        };
    }[];
}, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
export {};
