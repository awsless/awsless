import * as _aws_sdk_client_sqs from '@aws-sdk/client-sqs';
import { SQSClient } from '@aws-sdk/client-sqs';
export { SQSClient } from '@aws-sdk/client-sqs';
import { Duration } from '@awsless/duration';
import { Mock } from 'vitest';

declare const sqsClient: {
    (): SQSClient;
    set(client: SQSClient): void;
};

type Attributes = {
    [key: string]: string;
};
interface SendMessageOptions<Payload = unknown> {
    client?: SQSClient;
    queue: string;
    payload?: Payload;
    delay?: number;
    attributes?: Attributes;
}
interface SendMessageBatchOptions<Payload = unknown> {
    client?: SQSClient;
    queue: string;
    items: BatchItem<Payload>[];
}
interface BatchItem<Payload = unknown> {
    payload?: Payload;
    delay?: number;
    attributes?: Attributes;
}

declare const sendMessage: ({ client, queue, payload, delay, attributes, }: SendMessageOptions) => Promise<void>;
/** Add batch of messages to a SQS queue */
declare const sendMessageBatch: ({ client, queue, items }: SendMessageBatchOptions) => Promise<void>;
declare const receiveMessages: ({ client, queue, maxMessages, waitTime, visibilityTimeout, abortSignal, }: {
    client?: SQSClient;
    queue: string;
    maxMessages?: number;
    waitTime?: Duration;
    visibilityTimeout: Duration;
    abortSignal?: AbortSignal;
}) => Promise<_aws_sdk_client_sqs.Message[]>;
declare const deleteMessage: ({ client, queue, receiptHandle, }: {
    client?: SQSClient;
    queue: string;
    receiptHandle: string;
}) => Promise<void>;
declare const changeMessageVisibility: ({ client, queue, receiptHandle, visibilityTimeout, }: {
    client?: SQSClient;
    queue: string;
    receiptHandle: string;
    visibilityTimeout: Duration;
}) => Promise<void>;
declare const subscribe: ({ client, queue, maxMessages, waitTime, visibilityTimeout, autoExtendVisibility, handleMessage, }: {
    client?: SQSClient;
    queue: string;
    maxMessages: number;
    waitTime: Duration;
    visibilityTimeout: Duration;
    autoExtendVisibility?: boolean;
    handleMessage: (props: {
        payload: unknown;
        attributes?: Record<string, string>;
    }) => Promise<void> | void;
}) => () => void;

type Queues = {
    [key: string]: (payload: unknown) => unknown;
};
declare const mockSQS: <T extends Queues>(queues: T) => { [P in keyof T]: Mock<any, (...args: any[]) => any>; };

export { type BatchItem, type SendMessageBatchOptions, type SendMessageOptions, changeMessageVisibility, deleteMessage, mockSQS, receiveMessages, sendMessage, sendMessageBatch, sqsClient, subscribe };
