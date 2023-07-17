import * as _aws_sdk_client_sqs from '@aws-sdk/client-sqs';
import { SQSClient } from '@aws-sdk/client-sqs';
import { Mock } from 'vitest';
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
declare const mockSQS: <T extends Queues>(queues: T) => { [P in keyof T]: Mock<any, (...args: any[]) => any>; };

declare const sqsStruct: <A, B>(body: Struct<A, B>) => Struct<A[], Struct<A, B>>;

export { mockSQS, sendMessage, sendMessageBatch, sqsClient, sqsStruct };
