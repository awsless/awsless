import { SQSClient, Message } from '@aws-sdk/client-sqs';
export { SQSClient } from '@aws-sdk/client-sqs';
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
declare const receiveMessages: ({ client, queue, maxMessages, waitTimeSeconds, visibilityTimeout, }: {
    client?: SQSClient;
    queue: string;
    maxMessages?: number;
    waitTimeSeconds?: number;
    visibilityTimeout?: number;
}) => Promise<Message[]>;
declare const deleteMessage: ({ client, queue, receiptHandle, }: {
    client?: SQSClient;
    queue: string;
    receiptHandle: string;
}) => Promise<void>;
declare const listen: ({ client, queue, maxMessages, waitTimeSeconds, visibilityTimeout, heartbeatInterval, handleMessage, }: {
    client?: SQSClient;
    queue: string;
    maxMessages: number;
    waitTimeSeconds: number;
    visibilityTimeout: number;
    heartbeatInterval?: number;
    handleMessage: (message: Message, options: {
        signal: AbortSignal;
    }) => Promise<void>;
}) => (maxWaitTime?: number) => Promise<void>;

type Queues = {
    [key: string]: (payload: unknown) => unknown;
};
declare const mockSQS: <T extends Queues>(queues: T) => { [P in keyof T]: Mock<any, (...args: any[]) => any>; };

export { type BatchItem, type SendMessageBatchOptions, type SendMessageOptions, deleteMessage, listen, mockSQS, receiveMessages, sendMessage, sendMessageBatch, sqsClient };
