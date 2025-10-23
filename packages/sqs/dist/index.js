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
  DeleteMessageCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SendMessageBatchCommand,
  SendMessageCommand
} from "@aws-sdk/client-sqs";
import chunk from "chunk";
var formatAttributes = (attributes) => {
  const list = {};
  for (let key in attributes) {
    list[key] = {
      DataType: "String",
      StringValue: attributes[key]
    };
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
    MessageBody: JSON.stringify(payload),
    DelaySeconds: delay,
    MessageAttributes: formatAttributes({ queue, ...attributes })
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
          MessageBody: JSON.stringify(payload),
          DelaySeconds: delay,
          MessageAttributes: formatAttributes({ queue, ...attributes })
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
  waitTimeSeconds = 20,
  visibilityTimeout = 30
}) => {
  const url = await getCachedQueueUrl(client, queue);
  const command = new ReceiveMessageCommand({
    QueueUrl: url,
    MaxNumberOfMessages: maxMessages,
    WaitTimeSeconds: waitTimeSeconds,
    VisibilityTimeout: visibilityTimeout,
    MessageAttributeNames: ["All"]
  });
  const response = await client.send(command);
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
    VisibilityTimeout: visibilityTimeout
  });
  await client.send(command);
};
var listen = ({
  client = sqsClient(),
  queue,
  maxMessages,
  waitTimeSeconds,
  visibilityTimeout,
  heartbeatInterval,
  handleMessage
}) => {
  let isListening = true;
  let inFlightMessages = 0;
  const abortController = new AbortController();
  const signal = abortController.signal;
  const startHeartbeat = (receiptHandle, interval) => {
    const heartbeat = setInterval(async () => {
      if (!isListening || signal.aborted) {
        clearInterval(heartbeat);
        return;
      }
      await changeMessageVisibility({
        client,
        queue,
        receiptHandle,
        visibilityTimeout
      });
    }, interval);
    return () => clearInterval(heartbeat);
  };
  const poll = async () => {
    while (isListening && !signal.aborted) {
      try {
        const messages = await receiveMessages({
          client,
          queue,
          maxMessages,
          waitTimeSeconds,
          visibilityTimeout
        });
        if (messages.length > 0) {
          inFlightMessages += messages.length;
          await Promise.all(
            messages.map(async (message) => {
              let stopHeartbeat;
              try {
                if (heartbeatInterval) {
                  stopHeartbeat = startHeartbeat(message.ReceiptHandle, heartbeatInterval);
                }
                await handleMessage(message, { signal });
                if (!signal.aborted) {
                  await deleteMessage({
                    client,
                    queue,
                    receiptHandle: message.ReceiptHandle
                  });
                }
              } catch (error) {
                if (!signal.aborted) {
                  console.error("Error processing message:", error);
                }
              } finally {
                stopHeartbeat?.();
                inFlightMessages--;
              }
            })
          );
        } else {
          await new Promise((resolve) => setImmediate(resolve));
        }
      } catch (error) {
        if (isListening && !signal.aborted) {
          console.error("Error polling queue:", error);
        }
      }
    }
  };
  poll();
  return async (maxWaitTime = 60 * 1e3) => {
    isListening = false;
    abortController.abort();
    const deadline = Date.now() + maxWaitTime;
    while (inFlightMessages > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };
};

// src/mock.ts
import {
  ChangeMessageVisibilityCommand as ChangeMessageVisibilityCommand2,
  DeleteMessageCommand as DeleteMessageCommand2,
  GetQueueUrlCommand as GetQueueUrlCommand2,
  ReceiveMessageCommand as ReceiveMessageCommand2,
  SQSClient as SQSClient3,
  SendMessageBatchCommand as SendMessageBatchCommand2,
  SendMessageCommand as SendMessageCommand2
} from "@aws-sdk/client-sqs";
import { mockObjectValues, nextTick } from "@awsless/utils";
import { mockClient } from "aws-sdk-client-mock";
import { randomUUID } from "crypto";
var formatAttributes2 = (attributes) => {
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
    this.queues[queueUrl].push(message);
  }
  receiveMessages(queueUrl, maxMessages) {
    const messages = this.queues[queueUrl] || [];
    return messages.slice(0, maxMessages);
  }
  deleteMessage(queueUrl, receiptHandle) {
    if (this.queues[queueUrl]) {
      this.queues[queueUrl] = this.queues[queueUrl].filter((msg) => msg.ReceiptHandle !== receiptHandle);
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
  client.on(GetQueueUrlCommand2).callsFake((input) => ({ QueueUrl: input.QueueName })).on(SendMessageCommand2).callsFake(async (input) => {
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
  }).on(SendMessageBatchCommand2).callsFake(async (input) => {
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
        messageAttributes: formatAttributes2(entry.MessageAttributes)
      };
    });
    await nextTick(callback, {
      Records: records
    });
  }).on(ReceiveMessageCommand2).callsFake(async (input) => {
    const messages = messageStore.receiveMessages(input.QueueUrl, input.MaxNumberOfMessages ?? 1);
    return {
      Messages: messages
    };
  }).on(DeleteMessageCommand2).callsFake(async (input) => {
    messageStore.deleteMessage(input.QueueUrl, input.ReceiptHandle);
    return {};
  }).on(ChangeMessageVisibilityCommand2).callsFake(async () => {
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
  deleteMessage,
  listen,
  mockSQS,
  receiveMessages,
  sendMessage,
  sendMessageBatch,
  sqsClient
};
