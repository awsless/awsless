import * as valibot from 'valibot';
import { BaseSchema, SchemaWithTransform, StringSchema, Output, Pipe, ErrorMessage, UnknownSchema, Input } from 'valibot';
export * from 'valibot';
import { BigFloat } from '@awsless/big-float';
import { UUID } from 'crypto';
import { Duration, DurationFormat } from '@awsless/duration';
import { AnyTable, PrimaryKey, Infer } from '@awsless/dynamodb';

type JsonSchema<T extends BaseSchema> = SchemaWithTransform<StringSchema, Output<T>>;
declare const json: <T extends BaseSchema>(schema: T) => JsonSchema<T>;

type BigFloatSchema = BaseSchema<string | number | BigFloat | {
    exponent: number;
    coefficient: bigint;
}, BigFloat>;
declare function bigfloat(pipe?: Pipe<BigFloat>): BigFloatSchema;
declare function bigfloat(error?: ErrorMessage, pipe?: Pipe<BigFloat>): BigFloatSchema;

type BigIntSchema = BaseSchema<string | bigint, bigint>;
declare function bigint(pipe?: Pipe<bigint>): BigIntSchema;
declare function bigint(error?: ErrorMessage, pipe?: Pipe<bigint>): BigIntSchema;

type DateSchema = BaseSchema<string | Date, Date>;
declare function date(pipe?: Pipe<Date>): DateSchema;
declare function date(error?: ErrorMessage, pipe?: Pipe<Date>): DateSchema;

type UuidSchema = BaseSchema<UUID, UUID>;
declare const uuid: (error?: ErrorMessage) => UuidSchema;

type DurationSchema = BaseSchema<DurationFormat | Duration, Duration>;
declare function duration(pipe?: Pipe<Duration>): DurationSchema;
declare function duration(error?: ErrorMessage, pipe?: Pipe<Duration>): DurationSchema;

type SqsQueueSchema<S extends BaseSchema = UnknownSchema> = BaseSchema<Input<S> | Input<S>[] | {
    Records: {
        body: string | Input<S>;
    }[];
}, Output<S>[]>;
declare const sqsQueue: <S extends BaseSchema = UnknownSchema>(body?: S) => SqsQueueSchema<S>;

type SnsTopicSchema<S extends BaseSchema = UnknownSchema> = BaseSchema<Input<S> | Input<S>[] | {
    Records: {
        Sns: {
            Message: string | Input<S>;
        };
    }[];
}, Output<S>[]>;
declare const snsTopic: <S extends BaseSchema = UnknownSchema>(body?: S) => SnsTopicSchema<S>;

type DynamoDBStreamSchema<T extends AnyTable> = BaseSchema<{
    Records: Array<{
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
    }>;
}, Array<{
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
}>>;
declare const dynamoDbStream: <T extends AnyTable>(table: T) => DynamoDBStreamSchema<T>;

declare function positive<T extends BigFloat | number>(error?: ErrorMessage): valibot.CustomValidation<T>;

declare function precision<T extends BigFloat | number>(decimals: number, error?: ErrorMessage): valibot.CustomValidation<T>;

declare function unique<T extends any[]>(compare?: (a: T[number], b: T[number]) => boolean, error?: ErrorMessage): valibot.CustomValidation<T>;

declare function minDuration<T extends Duration>(min: Duration, error?: ErrorMessage): valibot.CustomValidation<T>;
declare function maxDuration<T extends Duration>(max: Duration, error?: ErrorMessage): valibot.CustomValidation<T>;

export { type BigFloatSchema, type BigIntSchema, type DateSchema, type DurationSchema, type DynamoDBStreamSchema, type JsonSchema, type SnsTopicSchema, type SqsQueueSchema, type UuidSchema, bigfloat, bigint, date, duration, dynamoDbStream, json, maxDuration, minDuration, positive, precision, snsTopic, sqsQueue, unique, uuid };
