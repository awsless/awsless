import { SQSClient, SQSClient as SQSClient$1 } from "@aws-sdk/client-sqs";
import { Duration } from "@awsless/duration";
//#region src/client.d.ts
declare const sqsClient: {
  (): SQSClient$1;
  set(client: SQSClient$1): void;
};
//#endregion
//#region src/types.d.ts
type Attributes = {
  [key: string]: string;
};
interface SendMessageOptions<Payload = unknown> {
  client?: SQSClient$1;
  queue: string;
  payload: Payload;
  delay?: number;
  groupId?: string;
  deduplicationId?: string;
  attributes?: Attributes;
}
interface SendMessageBatchOptions<Payload = unknown> {
  client?: SQSClient$1;
  queue: string;
  items: BatchItem<Payload>[];
}
interface BatchItem<Payload = unknown> {
  payload: Payload;
  delay?: number;
  groupId?: string;
  deduplicationId?: string;
  attributes?: Attributes;
}
//#endregion
//#region src/commands.d.ts
declare const getQueueUrl: (queue: string, client?: SQSClient$1) => Promise<string>;
declare const getCachedQueueUrl: (queue: string, client?: SQSClient$1) => Promise<string>;
declare const sendMessage: ({ client, queue, payload, delay, groupId, deduplicationId, attributes }: SendMessageOptions) => Promise<void>;
declare const sendMessageBatch: ({ client, queue, items }: SendMessageBatchOptions) => Promise<void>;
declare const receiveMessages: ({ client, queue, maxMessages, waitTime, visibilityTimeout, abortSignal }: {
  client?: SQSClient$1;
  queue: string;
  maxMessages?: number;
  waitTime?: Duration;
  visibilityTimeout: Duration;
  abortSignal?: AbortSignal;
}) => Promise<import("@aws-sdk/client-sqs").Message[]>;
declare const deleteMessage: ({ client, queue, receiptHandle }: {
  client?: SQSClient$1;
  queue: string;
  receiptHandle: string;
}) => Promise<void>;
declare const deleteMessageBatch: ({ client, queue, receiptHandles }: {
  client?: SQSClient$1;
  queue: string;
  receiptHandles: string[];
}) => Promise<void>;
declare const changeMessageVisibility: ({ client, queue, receiptHandle, visibilityTimeout }: {
  client?: SQSClient$1;
  queue: string;
  receiptHandle: string;
  visibilityTimeout: Duration;
}) => Promise<void>;
declare function subscribe({ client, queue, maxMessages, waitTime, visibilityTimeout, signal }: {
  client?: SQSClient$1;
  queue: string;
  maxMessages?: number;
  visibilityTimeout: Duration;
  waitTime?: Duration;
  signal?: AbortSignal;
}): AsyncGenerator<{
  payload: unknown;
  attributes: Record<string, string>;
}[], void, unknown>;
//#endregion
//#region src/mock.d.ts
type Queues = {
  [key: string]: (payload: unknown) => unknown;
};
declare const mockSQS: <T extends Queues>(queues: T) => { [P in keyof T]: import("vitest").Mock<(...args: any[]) => any>; };
//#endregion
export { type BatchItem, SQSClient, type SendMessageBatchOptions, type SendMessageOptions, changeMessageVisibility, deleteMessage, deleteMessageBatch, getCachedQueueUrl, getQueueUrl, mockSQS, receiveMessages, sendMessage, sendMessageBatch, sqsClient, subscribe };