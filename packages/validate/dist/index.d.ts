import { BaseSchema, CheckIssue, ErrorMessage, GenericIssue, GenericSchema, InferInput, InferOutput, MetadataAction } from "valibot";
import { BigFloat } from "@awsless/big-float";
import { Duration } from "@awsless/duration";
import { UUID } from "crypto";
import { AnyTable, Infer, PrimaryKey } from "@awsless/dynamodb";
export * from "valibot";
//#region src/action/redact.d.ts
declare const redact: () => MetadataAction<string, {
  redact: true;
}>;
declare const applyRedaction: <T>(schema: GenericSchema, input: T) => T;
//#endregion
//#region src/schema/json.d.ts
type JsonSchema<T extends GenericSchema> = BaseSchema<string, InferOutput<T>, GenericIssue>;
declare const json: <T extends GenericSchema>(schema: T, message?: ErrorMessage<GenericIssue>) => JsonSchema<T>;
//#endregion
//#region src/schema/bigfloat.d.ts
type BigFloatSchema = BaseSchema<BigFloat | string | bigint | number, BigFloat, GenericIssue>;
declare function bigfloat(message?: ErrorMessage<GenericIssue>): BigFloatSchema;
//#endregion
//#region src/schema/uuid.d.ts
type UuidSchema = BaseSchema<UUID, UUID, GenericIssue>;
declare const uuid: (message?: ErrorMessage<GenericIssue>) => UuidSchema;
//#endregion
//#region src/schema/duration.d.ts
type DurationSchema = BaseSchema<Duration, Duration, GenericIssue>;
declare function duration(message?: ErrorMessage<GenericIssue>): DurationSchema;
//#endregion
//#region src/schema/aws/sqs-queue.d.ts
type SqsQueueSchema<S extends GenericSchema> = BaseSchema<InferInput<S> | InferInput<S>[] | {
  Records: {
    body: string | InferInput<S>;
  }[];
}, InferOutput<S>[], GenericIssue>;
declare const sqsQueue: <S extends GenericSchema>(schema: S, message?: ErrorMessage<GenericIssue>) => SqsQueueSchema<S>;
//#endregion
//#region src/schema/aws/sns-topic.d.ts
type SnsTopicSchema<S extends GenericSchema> = BaseSchema<InferInput<S> | {
  Records: {
    Sns: {
      Message: string | InferInput<S>;
    };
  }[];
}, InferOutput<S>, GenericIssue>;
declare const snsTopic: <S extends GenericSchema>(schema: S, message?: ErrorMessage<GenericIssue>) => SnsTopicSchema<S>;
//#endregion
//#region src/schema/aws/dynamodb-stream.d.ts
type DynamoDBStreamInputRecord = {
  eventName: 'INSERT' | 'MODIFY' | 'REMOVE';
  dynamodb: {
    Keys: unknown;
    OldImage?: unknown;
    NewImage?: unknown;
  };
};
type DynamoDBStreamOutputRecord<T extends AnyTable> = {
  /** The kind of change that produced this record. */
  event: 'insert' | 'modify' | 'remove';
  /** The primary key of the affected item. */
  keys: PrimaryKey<T>;
  /** The item before the change, when the stream captures old images. */
  old?: Infer<T>;
  /** The item after the change, when the stream captures new images. */
  new?: Infer<T>;
};
type DynamoDBStreamSchema<T extends AnyTable> = BaseSchema<{
  Records: DynamoDBStreamInputRecord[];
}, DynamoDBStreamOutputRecord<T>[], GenericIssue>;
declare const dynamoDbStream: <T extends AnyTable>(table: T, message?: ErrorMessage<GenericIssue>) => DynamoDBStreamSchema<T>;
//#endregion
//#region src/schema/aws/s3-event.d.ts
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
//#endregion
//#region src/validation/positive.d.ts
declare function positive<T extends BigFloat | number>(message?: ErrorMessage<CheckIssue<T>>): import("valibot").CheckAction<T, ErrorMessage<CheckIssue<T>>>;
//#endregion
//#region src/validation/precision.d.ts
declare function precision<T extends BigFloat | number>(decimals: number, message?: ErrorMessage<CheckIssue<T>>): import("valibot").CheckAction<T, ErrorMessage<CheckIssue<T>>>;
//#endregion
//#region src/validation/unique.d.ts
declare function unique<T extends any[]>(compare?: (a: T[number], b: T[number]) => boolean, message?: ErrorMessage<CheckIssue<T>>): import("valibot").CheckAction<T, ErrorMessage<CheckIssue<T>>>;
//#endregion
//#region src/validation/duration.d.ts
declare function minDuration(min: Duration, message?: ErrorMessage<CheckIssue<Duration>>): import("valibot").CheckAction<Duration, ErrorMessage<CheckIssue<Duration>>>;
declare function maxDuration(max: Duration, message?: ErrorMessage<CheckIssue<Duration>>): import("valibot").CheckAction<Duration, ErrorMessage<CheckIssue<Duration>>>;
//#endregion
export { type BigFloatSchema, type DurationSchema, type DynamoDBStreamSchema, type JsonSchema, type S3EventSchema, type SnsTopicSchema, type SqsQueueSchema, type UuidSchema, applyRedaction, bigfloat, duration, dynamoDbStream, json, maxDuration, minDuration, positive, precision, redact, s3Event, snsTopic, sqsQueue, unique, uuid };