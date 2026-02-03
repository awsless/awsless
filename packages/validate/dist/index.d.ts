import * as valibot from 'valibot';
import { GenericSchema, ErrorMessage, GenericIssue, BaseSchema, InferOutput, InferInput, CheckIssue } from 'valibot';
export * from 'valibot';
import { BigFloat } from '@awsless/big-float';
import { UUID } from 'crypto';
import { Duration } from '@awsless/duration';
import { AnyTable, PrimaryKey, Infer } from '@awsless/dynamodb';

type JsonSchema<T extends GenericSchema> = BaseSchema<string, InferOutput<T>, GenericIssue>;
declare const json: <T extends GenericSchema>(schema: T, message?: ErrorMessage<GenericIssue>) => JsonSchema<T>;

type BigFloatSchema = BaseSchema<BigFloat | string | bigint | number, BigFloat, GenericIssue>;
declare function bigfloat(message?: ErrorMessage<GenericIssue>): BigFloatSchema;

type UuidSchema = BaseSchema<UUID, UUID, GenericIssue>;
declare const uuid: (message?: ErrorMessage<GenericIssue>) => UuidSchema;

type DurationSchema = BaseSchema<Duration, Duration, GenericIssue>;
declare function duration(message?: ErrorMessage<GenericIssue>): DurationSchema;

type SqsQueueSchema<S extends GenericSchema> = BaseSchema<InferInput<S> | InferInput<S>[] | {
    Records: {
        body: string | InferInput<S>;
    }[];
}, InferOutput<S>[], GenericIssue>;
declare const sqsQueue: <S extends GenericSchema>(schema: S, message?: ErrorMessage<GenericIssue>) => SqsQueueSchema<S>;

type SnsTopicSchema<S extends GenericSchema> = BaseSchema<InferInput<S> | InferInput<S>[] | {
    Records: {
        Sns: {
            Message: string | InferInput<S>;
        };
    }[];
}, InferOutput<S>[], GenericIssue>;
declare const snsTopic: <S extends GenericSchema>(schema: S, message?: ErrorMessage<GenericIssue>) => SnsTopicSchema<S>;

type DynamoDBStreamInputRecord = {
    eventName: 'MODIFY';
    dynamodb: {
        Keys: unknown;
        OldImage: unknown;
        NewImage: unknown;
    };
} | {
    eventName: 'INSERT';
    dynamodb: {
        Keys: unknown;
        NewImage: unknown;
    };
} | {
    eventName: 'REMOVE';
    dynamodb: {
        Keys: unknown;
        OldImage: unknown;
    };
};
type DynamoDBStreamOutputRecord<T extends AnyTable> = {
    event: 'modify';
    keys: PrimaryKey<T>;
    old: Infer<T>;
    new: Infer<T>;
} | {
    event: 'insert';
    keys: PrimaryKey<T>;
    new: Infer<T>;
} | {
    event: 'remove';
    keys: PrimaryKey<T>;
    old: Infer<T>;
};
type DynamoDBStreamSchema<T extends AnyTable> = BaseSchema<{
    Records: DynamoDBStreamInputRecord[];
}, DynamoDBStreamOutputRecord<T>[], GenericIssue>;
declare const dynamoDbStream: <T extends AnyTable>(table: T, message?: ErrorMessage<GenericIssue>) => DynamoDBStreamSchema<T>;

type S3EventOutput = {
    event: string;
    time: Date;
    bucket: string;
    key: string;
    size: number;
    eTag: string;
};
type S3EventSchema = BaseSchema<S3EventOutput | S3EventOutput[] | {
    Records: {
        eventTime: string;
    }[];
}, S3EventOutput[], GenericIssue>;
declare const s3Event: () => S3EventSchema;

declare function positive<T extends BigFloat | number>(message?: ErrorMessage<CheckIssue<T>>): valibot.CheckAction<T, ErrorMessage<CheckIssue<T>>>;

declare function precision<T extends BigFloat | number>(decimals: number, message?: ErrorMessage<CheckIssue<T>>): valibot.CheckAction<T, ErrorMessage<CheckIssue<T>>>;

declare function unique<T extends any[]>(compare?: (a: T[number], b: T[number]) => boolean, message?: ErrorMessage<CheckIssue<T>>): valibot.CheckAction<T, ErrorMessage<CheckIssue<T>>>;

declare function minDuration(min: Duration, message?: ErrorMessage<CheckIssue<Duration>>): valibot.CheckAction<Duration, ErrorMessage<CheckIssue<Duration>>>;
declare function maxDuration(max: Duration, message?: ErrorMessage<CheckIssue<Duration>>): valibot.CheckAction<Duration, ErrorMessage<CheckIssue<Duration>>>;

export { type BigFloatSchema, type DurationSchema, type DynamoDBStreamSchema, type JsonSchema, type S3EventSchema, type SnsTopicSchema, type SqsQueueSchema, type UuidSchema, bigfloat, duration, dynamoDbStream, json, maxDuration, minDuration, positive, precision, s3Event, snsTopic, sqsQueue, unique, uuid };
