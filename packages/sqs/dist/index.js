// src/index.ts
import { SQSClient as SQSClient4 } from "@aws-sdk/client-sqs";

// src/client.ts
import { SQSClient } from "@aws-sdk/client-sqs";
import { globalClient } from "@awsless/utils";
var sqsClient = globalClient(() => {
  return new SQSClient({});
});

// src/commands.ts
import {
  ChangeMessageVisibilityCommand,
  DeleteMessageBatchCommand,
  DeleteMessageCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SendMessageBatchCommand,
  SendMessageCommand
} from "@aws-sdk/client-sqs";
import { seconds, toSeconds } from "@awsless/duration";
import { parse, stringify } from "@awsless/json";
import chunk from "chunk";
var encodeAttributes = (attributes) => {
  const list = {};
  for (const key in attributes) {
    list[key] = {
      DataType: "String",
      StringValue: attributes[key]
    };
  }
  return list;
};
var decodeAttributes = (attributes) => {
  const list = {};
  for (const key in attributes) {
    list[key] = attributes[key]?.StringValue;
  }
  return list;
};
var getQueueUrl = async (client, queue) => {
  if (queue.includes("://")) {
    return queue;
  }
  const command = new GetQueueUrlCommand({ QueueName: queue });
  const response = await client.send(command);
  return response.QueueUrl;
};
var cache = /* @__PURE__ */ new Map();
var getCachedQueueUrl = (client, queue) => {
  if (!cache.has(queue)) {
    cache.set(queue, getQueueUrl(client, queue));
  }
  return cache.get(queue);
};
var sendMessage = async ({
  client = sqsClient(),
  queue,
  payload,
  delay = 0,
  attributes = {}
}) => {
  const url = await getCachedQueueUrl(client, queue);
  const command = new SendMessageCommand({
    QueueUrl: url,
    MessageBody: stringify(payload),
    DelaySeconds: delay,
    MessageAttributes: encodeAttributes({ queue, ...attributes })
  });
  await client.send(command);
};
var sendMessageBatch = async ({ client = sqsClient(), queue, items }) => {
  const url = await getCachedQueueUrl(client, queue);
  await Promise.all(
    chunk(items, 10).map(async (batch) => {
      const command = new SendMessageBatchCommand({
        QueueUrl: url,
        Entries: batch.map(({ payload, delay = 0, attributes = {} }, id) => ({
          Id: String(id),
          MessageBody: stringify(payload),
          DelaySeconds: delay,
          MessageAttributes: encodeAttributes({ queue, ...attributes })
        }))
      });
      return client.send(command);
    })
  );
};
var receiveMessages = async ({
  client = sqsClient(),
  queue,
  maxMessages = 10,
  waitTime = seconds(20),
  visibilityTimeout,
  abortSignal
}) => {
  const url = await getCachedQueueUrl(client, queue);
  const command = new ReceiveMessageCommand({
    QueueUrl: url,
    MaxNumberOfMessages: maxMessages,
    WaitTimeSeconds: toSeconds(waitTime),
    VisibilityTimeout: toSeconds(visibilityTimeout),
    MessageAttributeNames: ["All"]
  });
  const response = await client.send(command, { abortSignal });
  return response.Messages ?? [];
};
var deleteMessage = async ({
  client = sqsClient(),
  queue,
  receiptHandle
}) => {
  const url = await getCachedQueueUrl(client, queue);
  const command = new DeleteMessageCommand({
    QueueUrl: url,
    ReceiptHandle: receiptHandle
  });
  await client.send(command);
};
var deleteMessageBatch = async ({
  client = sqsClient(),
  queue,
  receiptHandles
}) => {
  const url = await getCachedQueueUrl(client, queue);
  await Promise.all(
    chunk(receiptHandles, 10).map(async (batch) => {
      const command = new DeleteMessageBatchCommand({
        QueueUrl: url,
        Entries: batch.map((receiptHandle, index) => ({
          Id: String(index),
          ReceiptHandle: receiptHandle
        }))
      });
      await client.send(command);
    })
  );
};
var changeMessageVisibility = async ({
  client = sqsClient(),
  queue,
  receiptHandle,
  visibilityTimeout
}) => {
  const url = await getCachedQueueUrl(client, queue);
  const command = new ChangeMessageVisibilityCommand({
    QueueUrl: url,
    ReceiptHandle: receiptHandle,
    VisibilityTimeout: toSeconds(visibilityTimeout)
  });
  await client.send(command);
};
async function* subscribe({
  client = sqsClient(),
  queue,
  maxMessages = 10,
  waitTime,
  visibilityTimeout,
  signal
}) {
  while (!signal?.aborted) {
    let messages;
    try {
      messages = await receiveMessages({
        client,
        queue,
        maxMessages,
        waitTime,
        visibilityTimeout,
        abortSignal: signal
      });
    } catch (error) {
      if (signal?.aborted) return;
      console.error(
        JSON.stringify({
          message: "Error polling queue",
          error: error instanceof Error ? { ...error, name: error.name, message: error.message } : error
        })
      );
      await new Promise((resolve) => setTimeout(resolve, 5e3));
      continue;
    }
    const parsed = [];
    for (const message of messages) {
      try {
        parsed.push({
          record: {
            payload: parse(message.Body),
            attributes: decodeAttributes(message.MessageAttributes)
          },
          receiptHandle: message.ReceiptHandle
        });
      } catch (error) {
        console.error(
          JSON.stringify({
            message: "Error processing message body",
            error
          })
        );
      }
    }
    if (parsed.length === 0) continue;
    yield parsed.map((p) => p.record);
    try {
      await deleteMessageBatch({
        client,
        queue,
        receiptHandles: parsed.map((p) => p.receiptHandle)
      });
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "Error deleting messages",
          error
        })
      );
    }
  }
}

// src/mock.ts
import {
  ChangeMessageVisibilityCommand as ChangeMessageVisibilityCommand2,
  DeleteMessageBatchCommand as DeleteMessageBatchCommand2,
  DeleteMessageCommand as DeleteMessageCommand2,
  GetQueueUrlCommand as GetQueueUrlCommand2,
  ReceiveMessageCommand as ReceiveMessageCommand2,
  SQSClient as SQSClient3,
  SendMessageBatchCommand as SendMessageBatchCommand2,
  SendMessageCommand as SendMessageCommand2
} from "@aws-sdk/client-sqs";
import { mockObjectValues, nextTick } from "@awsless/utils";
import { mockClient } from "aws-sdk-vitest-mock";
import { randomUUID } from "crypto";
var formatAttributes = (attributes) => {
  const list = {};
  for (const [key, attr] of Object.entries(attributes ?? {})) {
    list[key] = {
      dataType: attr.DataType,
      stringValue: attr.StringValue
    };
  }
  return list;
};
var MessageStore = class {
  queues = {};
  addMessage(queueUrl, message) {
    if (!this.queues[queueUrl]) {
      this.queues[queueUrl] = [];
    }
    this.queues[queueUrl].push({ message });
  }
  receiveMessages(queueUrl, maxMessages, timeout = 1) {
    const messages = this.queues[queueUrl] ?? [];
    return messages.filter((entry) => !entry.invisible || Date.now() > entry.invisible).slice(0, maxMessages).map((entry) => {
      entry.invisible = Date.now() + timeout * 1e3;
      return entry.message;
    });
  }
  deleteMessage(queueUrl, receiptHandle) {
    if (this.queues[queueUrl]) {
      this.queues[queueUrl] = this.queues[queueUrl].filter(
        (entry) => entry.message.ReceiptHandle !== receiptHandle
      );
    }
  }
  changeVisibility(queueUrl, receiptHandle, timeout) {
    const messages = this.queues[queueUrl] ?? [];
    for (const entry of messages) {
      if (entry.message.ReceiptHandle === receiptHandle) {
        entry.invisible = Date.now() + timeout * 1e3;
      }
    }
  }
  clear() {
    this.queues = {};
  }
};
var mockSQS = (queues) => {
  const list = mockObjectValues(queues);
  const messageStore = new MessageStore();
  const get = (input) => {
    const name = input.QueueUrl;
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`SQS mock function not defined for: ${name}`);
    }
    return callback;
  };
  const client = mockClient(SQSClient3);
  client.on(GetQueueUrlCommand2).callsFake(async (input) => ({ QueueUrl: input.QueueName }));
  client.on(SendMessageCommand2).callsFake(async (input) => {
    const callback = get(input);
    const messageId = randomUUID();
    const receiptHandle = randomUUID();
    messageStore.addMessage(input.QueueUrl, {
      MessageId: messageId,
      ReceiptHandle: receiptHandle,
      Body: input.MessageBody,
      MessageAttributes: input.MessageAttributes
    });
    await nextTick(callback, {
      Records: [
        {
          body: input.MessageBody,
          messageId,
          messageAttributes: input.MessageAttributes
        }
      ]
    });
    return {
      MessageId: messageId
    };
  });
  client.on(SendMessageBatchCommand2).callsFake(async (input) => {
    const callback = get(input);
    const records = input.Entries?.map((entry) => {
      const messageId = entry.Id || randomUUID();
      const receiptHandle = randomUUID();
      messageStore.addMessage(input.QueueUrl, {
        MessageId: messageId,
        ReceiptHandle: receiptHandle,
        Body: entry.MessageBody,
        MessageAttributes: entry.MessageAttributes
      });
      return {
        body: entry.MessageBody,
        messageId,
        messageAttributes: formatAttributes(entry.MessageAttributes)
      };
    });
    await nextTick(callback, {
      Records: records
    });
    return {};
  });
  client.on(ReceiveMessageCommand2).callsFake(async (input) => {
    const deadline = Date.now() + (input.WaitTimeSeconds || 1) * 1e3;
    while (Date.now() < deadline) {
      const messages = messageStore.receiveMessages(
        input.QueueUrl,
        input.MaxNumberOfMessages ?? 1,
        input.VisibilityTimeout
      );
      if (messages.length > 0) {
        return {
          Messages: messages
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return {
      Messages: []
    };
  });
  client.on(DeleteMessageCommand2).callsFake(async (input) => {
    messageStore.deleteMessage(input.QueueUrl, input.ReceiptHandle);
    return {};
  });
  client.on(DeleteMessageBatchCommand2).callsFake(async (input) => {
    for (const entry of input.Entries ?? []) {
      messageStore.deleteMessage(input.QueueUrl, entry.ReceiptHandle);
    }
    return {};
  });
  client.on(ChangeMessageVisibilityCommand2).callsFake(async (input) => {
    messageStore.changeVisibility(input.QueueUrl, input.ReceiptHandle, input.VisibilityTimeout);
    return {};
  });
  beforeEach(() => {
    Object.values(list).forEach((fn) => {
      fn.mockClear();
    });
  });
  beforeAll(() => {
    messageStore.clear();
  });
  return list;
};
export {
  SQSClient4 as SQSClient,
  changeMessageVisibility,
  deleteMessage,
  deleteMessageBatch,
  mockSQS,
  receiveMessages,
  sendMessage,
  sendMessageBatch,
  sqsClient,
  subscribe
};
