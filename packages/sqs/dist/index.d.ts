import * as _aws_sdk_client_sqs from '@aws-sdk/client-sqs';
import { SQSClient } from '@aws-sdk/client-sqs';
import * as vitest_dist_index_5aad25c1 from 'vitest/dist/index-5aad25c1';
import * as superstruct_dist_utils from 'superstruct/dist/utils';
import { Struct } from '@awsless/validate';

declare const sqsClient: {
    (): SQSClient;
    set(client: SQSClient): void;
};

type Attributes = {
    [key: string]: string;
};
interface SendMessage {
    client?: SQSClient;
    queue: string;
    payload?: unknown;
    delay?: number;
    attributes?: Attributes;
}
interface SendMessageBatch {
    client?: SQSClient;
    queue: string;
    items: BatchItem[];
}
interface BatchItem {
    payload?: unknown;
    delay?: number;
    attributes?: Attributes;
}

declare const sendMessage: ({ client, queue, payload, delay, attributes, }: SendMessage) => Promise<_aws_sdk_client_sqs.SendMessageCommandOutput>;
/** Add batch of messages to a SQS queue */
declare const sendMessageBatch: ({ client, queue, items }: SendMessageBatch) => Promise<void>;

type Queues = {
    [key: string]: (payload: unknown) => unknown;
};
declare const mockSQS: <T extends Queues>(queues: T) => { [P in keyof T]: vitest_dist_index_5aad25c1.x<any, (...args: unknown[]) => unknown>; };

type Input<T> = {
    Records: {
        body: T;
    }[];
};
declare const sqsRecords: <T>(input: Input<T>) => T[];
declare const sqsStruct: <A, B>(body: Struct<A, B>) => Struct<{
    Records: superstruct_dist_utils.Simplify<superstruct_dist_utils.Optionalize<{
        body: A;
        messageId: string;
        messageAttributes: Record<string, {
            dataType: string;
            stringValue: string;
        }>;
    }>>[];
}, {
    Records: Struct<superstruct_dist_utils.Simplify<superstruct_dist_utils.Optionalize<{
        body: A;
        messageId: string;
        messageAttributes: Record<string, {
            dataType: string;
            stringValue: string;
        }>;
    }>>[], Struct<superstruct_dist_utils.Simplify<superstruct_dist_utils.Optionalize<{
        body: A;
        messageId: string;
        messageAttributes: Record<string, {
            dataType: string;
            stringValue: string;
        }>;
    }>>, {
        body: Struct<A, B>;
        messageId: Struct<string, null>;
        messageAttributes: Struct<Record<string, {
            dataType: string;
            stringValue: string;
        }>, null>;
    }>>;
}>;
declare const sqsInput: (records: unknown[]) => {
    Records: {
        messageId: number;
        body: string;
    }[];
};

export { mockSQS, sendMessage, sendMessageBatch, sqsClient, sqsInput, sqsRecords, sqsStruct };
