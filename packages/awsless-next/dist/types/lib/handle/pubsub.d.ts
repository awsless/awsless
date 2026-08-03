import { Duration } from '@awsless/duration';
import { Handler } from '@awsless/lambda';
import { InferOutput } from '@awsless/validate';
export type PubSubAuthResult = {
    authorized: true;
    allowed: string[];
    context?: Record<string, unknown>;
    ttl?: Duration;
    disconnectAfter?: Duration;
} | {
    authorized: false;
};
declare const authEventSchema: import("valibot").ObjectSchema<{
    readonly token: import("valibot").OptionalSchema<import("valibot").StringSchema<undefined>, undefined>;
}, undefined>;
export declare const auth: <H extends Handler<typeof authEventSchema, PubSubAuthResult | Promise<PubSubAuthResult>>>(handle: H) => (event: {
    token?: string | undefined;
}, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
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
export type ConnectedEvent = InferOutput<typeof connectedSchema>;
export type DisconnectedEvent = InferOutput<typeof disconnectedSchema>;
export type SubscribedEvent = InferOutput<typeof subscribedSchema>;
export type UnsubscribedEvent = InferOutput<typeof unsubscribedSchema>;
export type AuthEvent = InferOutput<typeof authEventSchema>;
export type AuthResponse = PubSubAuthResult;
export declare const connected: <H extends Handler<typeof connectedSchema>>(handle: H) => (event: {
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
export declare const disconnected: <H extends Handler<typeof disconnectedSchema>>(handle: H) => (event: {
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
export declare const subscribed: <H extends Handler<typeof subscribedSchema>>(handle: H) => (event: {
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
export declare const unsubscribed: <H extends Handler<typeof unsubscribedSchema>>(handle: H) => (event: {
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
