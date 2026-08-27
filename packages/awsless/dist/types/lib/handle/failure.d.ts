import { Handler } from '@awsless/lambda';
import { GenericSchema, InferInput } from '@awsless/validate';
/** The event the app level on-failure handler receives for every failed async consumer. */
export type FailureEvent = {
    /** The unique id of the failure. */
    id: string;
    /** The moment the failure happened. */
    date: Date;
    /** The kind of consumer that failed, like "queue" or "dynamodb-stream". */
    type: string;
    /** The original payload the failed consumer received. */
    payload?: unknown;
    /** The resource the failure originated from. */
    source?: {
        resource?: string;
        event?: unknown;
    };
    /** The queue holding the failed message, for queue failures. */
    queue?: {
        name?: string;
    };
    /** The lambda function the failure happened in. */
    function?: {
        name?: string;
    };
    /** The error that caused the failure. */
    error?: {
        type?: string;
        message?: string;
        stackTrace?: string[];
    };
} & Record<string, unknown>;
type FailureHandler = (event: FailureEvent, context: Parameters<Handler>[1]) => unknown;
export declare const failure: <H extends FailureHandler>(handle: H) => (event: unknown, context?: import("aws-lambda").Context) => Promise<unknown>;
declare const onErrorLogSchema: import("valibot").ObjectSchema<{
    readonly hash: import("valibot").StringSchema<undefined>;
    readonly requestId: import("valibot").StringSchema<undefined>;
    readonly origin: import("valibot").StringSchema<undefined>;
    readonly level: import("valibot").PicklistSchema<["warn", "error", "fatal"], undefined>;
    readonly type: import("valibot").StringSchema<undefined>;
    readonly message: import("valibot").StringSchema<undefined>;
    readonly stackTrace: import("valibot").OptionalSchema<import("valibot").ArraySchema<import("valibot").StringSchema<undefined>, undefined>, undefined>;
    readonly data: import("valibot").OptionalSchema<import("valibot").UnknownSchema, undefined>;
    readonly date: import("valibot").UnionSchema<[import("valibot").DateSchema<undefined>, import("valibot").SchemaWithPipe<readonly [import("valibot").StringSchema<undefined>, import("valibot").IsoTimestampAction<string, undefined>, import("valibot").TransformAction<string, Date>]>], undefined>;
}, undefined>;
/** The parsed log entry an error handler receives. */
export type ErrorEvent = {
    /** The stable hash of the error, grouping repeated occurrences. */
    hash: string;
    /** The aws request id of the invocation that logged the error. */
    requestId: string;
    /** The bundle route key the error originated from. */
    origin: string;
    /** The severity of the log entry. */
    level: 'warn' | 'error' | 'fatal';
    /** The error type, like the class name of the thrown error. */
    type: string;
    /** The error message. */
    message: string;
    /** The stack trace lines of the error. */
    stackTrace?: string[];
    /** Extra structured data attached to the log entry. */
    data?: unknown;
    /** The moment the error was logged. */
    date: Date;
};
type ErrorSchema = GenericSchema<InferInput<typeof onErrorLogSchema>, ErrorEvent>;
export declare const error: <H extends Handler<ErrorSchema>>(handle: H) => (event: {
    hash: string;
    requestId: string;
    origin: string;
    level: "warn" | "error" | "fatal";
    type: string;
    message: string;
    stackTrace?: string[] | undefined;
    data?: unknown;
    date: string | Date;
}, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
export {};
