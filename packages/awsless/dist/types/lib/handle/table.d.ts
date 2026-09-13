import { AnyTable } from '@awsless/dynamodb';
import { Handler } from '@awsless/lambda';
import { DynamoDBStreamSchema, InferOutput } from '@awsless/validate';
/** The array of parsed change records a stream handler receives. */
export type StreamEvent<T extends AnyTable> = InferOutput<DynamoDBStreamSchema<T>>;
export declare const stream: <T extends AnyTable, H extends Handler<DynamoDBStreamSchema<T>>>(table: T, handle: H) => (event: {
    Records: {
        eventName: 'INSERT' | 'MODIFY' | 'REMOVE';
        dynamodb: {
            Keys: unknown;
            OldImage?: unknown;
            NewImage?: unknown;
        };
    }[];
}, context?: import("@awsless/lambda").LambdaContext) => Promise<Awaited<ReturnType<H>>>;
