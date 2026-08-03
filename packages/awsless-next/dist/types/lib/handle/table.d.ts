import { AnyTable } from '@awsless/dynamodb';
import { Handler } from '@awsless/lambda';
import { DynamoDBStreamSchema, InferOutput } from '@awsless/validate';
export type StreamEvent<T extends AnyTable> = InferOutput<DynamoDBStreamSchema<T>>;
export declare const stream: <T extends AnyTable, H extends Handler<DynamoDBStreamSchema<T>>>(table: T, handle: H) => (event: {
    Records: {
        eventName: "INSERT" | "MODIFY" | "REMOVE";
        dynamodb: {
            Keys: unknown;
            OldImage?: unknown;
            NewImage?: unknown;
        };
    }[];
}, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
