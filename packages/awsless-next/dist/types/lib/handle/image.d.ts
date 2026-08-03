import { Handler } from '@awsless/lambda';
import { InferOutput } from '@awsless/validate';
declare const imageOriginSchema: import("valibot").ObjectSchema<{
    readonly path: import("valibot").StringSchema<undefined>;
}, "Invalid image origin input">;
export type ImageEvent = InferOutput<typeof imageOriginSchema>;
export type ImageResponse = string | undefined;
export declare const image: <H extends Handler<typeof imageOriginSchema, ImageResponse | Promise<ImageResponse>>>(handle: H) => (event: {
    path: string;
}, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
export declare const icon: <H extends Handler<typeof imageOriginSchema, ImageResponse | Promise<ImageResponse>>>(handle: H) => (event: {
    path: string;
}, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
export {};
