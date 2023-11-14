import { BaseSchema, SchemaWithTransform, StringSchema, Output, Pipe, ErrorMessage, UnknownSchema, Input, PipeResult } from 'valibot';
export * from 'valibot';
import { BigFloat } from '@awsless/big-float';
import { UUID } from 'crypto';
import { TableDefinition, PrimaryKey } from '@awsless/dynamodb';

type JsonSchema<T extends BaseSchema> = SchemaWithTransform<StringSchema, Output<T>>;
declare const json: <T extends BaseSchema<any, any>>(schema: T) => JsonSchema<T>;

type BigFloatSchema = BaseSchema<string | number | BigFloat | {
    exponent: number;
    coefficient: bigint;
}, BigFloat>;
declare function bigfloat(pipe?: Pipe<BigFloat>): BigFloatSchema;
declare function bigfloat(error?: ErrorMessage, pipe?: Pipe<BigFloat>): BigFloatSchema;

type DateSchema = BaseSchema<string | Date, Date>;
declare function date(pipe?: Pipe<Date>): DateSchema;
declare function date(error?: ErrorMessage, pipe?: Pipe<Date>): DateSchema;

type UuidSchema = SchemaWithTransform<StringSchema | BaseSchema<UUID>, UUID>;
declare const uuid: () => UuidSchema;

type SqsQueueSchema<S extends BaseSchema = UnknownSchema> = BaseSchema<Input<S> | Input<S>[] | {
    Records: {
        body: string | Input<S>;
    }[];
}, Output<S>[]>;
declare const sqsQueue: <S extends BaseSchema<any, any> = UnknownSchema<unknown>>(body?: S | undefined) => SqsQueueSchema<S>;

type SnsTopicSchema<S extends BaseSchema = UnknownSchema> = BaseSchema<Input<S> | Input<S>[] | {
    Records: {
        Sns: {
            Message: string | Input<S>;
        };
    }[];
}, Output<S>[]>;
declare const snsTopic: <S extends BaseSchema<any, any> = UnknownSchema<unknown>>(body?: S | undefined) => SnsTopicSchema<S>;

type EventName = 'MODIFY' | 'INSERT' | 'REMOVE';
type DynamoDBStreamSchema<T extends TableDefinition<any, any, any, any>> = BaseSchema<{
    Records: {
        eventName: EventName;
        dynamodb: {
            Keys: unknown;
            OldImage?: unknown;
            NewImage?: unknown;
        };
    }[];
}, {
    event: EventName;
    keys: PrimaryKey<T>;
    old?: Partial<T['schema']['OUTPUT']>;
    new?: Partial<T['schema']['OUTPUT']>;
}[]>;
declare const dynamoDbStream: <T extends TableDefinition<any, any, any, any>>(table: T) => DynamoDBStreamSchema<T>;

declare function positive<T extends BigFloat | number>(error?: ErrorMessage): (input: T) => PipeResult<T>;

declare function precision<T extends BigFloat | number>(decimals: number, error?: ErrorMessage): (input: T) => PipeResult<T>;

declare function unique<T extends any[]>(compare?: (a: T[number], b: T[number]) => boolean, error?: ErrorMessage): (input: T) => PipeResult<T>;

export { BigFloatSchema, DateSchema, DynamoDBStreamSchema, JsonSchema, SnsTopicSchema, SqsQueueSchema, UuidSchema, bigfloat, date, dynamoDbStream, json, positive, precision, snsTopic, sqsQueue, unique, uuid };
