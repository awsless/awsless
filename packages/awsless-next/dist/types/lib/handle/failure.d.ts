import { Handler } from '@awsless/lambda';
import { InferOutput } from '@awsless/validate';
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
export type ErrorEvent = InferOutput<typeof onErrorLogSchema>;
export type FailureEvent = {
    id: string;
    date: Date | string;
    type: string;
    payload?: unknown;
    source?: {
        resource?: string;
        event?: unknown;
    };
    queue?: {
        name?: string;
    };
    function?: {
        name?: string;
    };
    error?: {
        type?: string;
        message?: string;
        stackTrace?: string[];
    };
} & Record<string, unknown>;
type FailureHandler = (event: FailureEvent, context: Parameters<Handler>[1]) => unknown;
export declare const failure: <H extends FailureHandler>(handle: H) => (event: unknown, context?: import("aws-lambda").Context) => Promise<unknown>;
export declare const error: <H extends Handler<typeof onErrorLogSchema>>(handle: H) => (event: {
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
