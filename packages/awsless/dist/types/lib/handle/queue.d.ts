import { Handler } from '@awsless/lambda';
import { GenericSchema, InferOutput, SqsQueueSchema } from '@awsless/validate';
/** The array of parsed message bodies a queue handler receives. */
export type QueueEvent<S extends GenericSchema> = InferOutput<SqsQueueSchema<S>>;
export declare const queue: <S extends GenericSchema, H extends Handler<SqsQueueSchema<S>>>(schema: S, handle: H) => (event: import("valibot").InferInput<S>[] | {
    Records: {
        body: string | import("valibot").InferInput<S>;
    }[];
} | import("valibot").InferInput<S>, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
