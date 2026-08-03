import { Duration } from '@awsless/duration';
import { Handler } from '@awsless/lambda';
import { InferOutput } from '@awsless/validate';
export type RpcAuthResult = {
    authorized: true;
    ttl: Duration;
    context?: Record<string, unknown>;
    allowedFunctions?: string[];
    lockKey?: string;
} | {
    authorized: false;
};
declare const authEventSchema: import("valibot").ObjectSchema<{
    readonly token: import("valibot").StringSchema<undefined>;
}, undefined>;
export type AuthEvent = InferOutput<typeof authEventSchema>;
export type AuthResponse = RpcAuthResult;
export declare const auth: <H extends Handler<typeof authEventSchema, RpcAuthResult | Promise<RpcAuthResult>>>(handle: H) => (event: {
    token: string;
}, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
export {};
