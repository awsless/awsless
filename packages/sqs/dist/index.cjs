"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  SQSClient: () => import_client_sqs4.SQSClient,
  deleteMessage: () => deleteMessage,
  listen: () => listen,
  mockSQS: () => mockSQS,
  receiveMessages: () => receiveMessages,
  sendMessage: () => sendMessage,
  sendMessageBatch: () => sendMessageBatch,
  sqsClient: () => sqsClient
});
module.exports = __toCommonJS(index_exports);
var import_client_sqs4 = require("@aws-sdk/client-sqs");

// src/client.ts
var import_client_sqs = require("@aws-sdk/client-sqs");
var import_utils = require("@awsless/utils");
var sqsClient = (0, import_utils.globalClient)(() => {
  return new import_client_sqs.SQSClient({});
});

// src/commands.ts
var import_client_sqs2 = require("@aws-sdk/client-sqs");
var import_chunk = __toESM(require("chunk"), 1);
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
  const command = new import_client_sqs2.GetQueueUrlCommand({ QueueName: queue });
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
  const command = new import_client_sqs2.SendMessageCommand({
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
    (0, import_chunk.default)(items, 10).map(async (batch) => {
      const command = new import_client_sqs2.SendMessageBatchCommand({
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
  const command = new import_client_sqs2.ReceiveMessageCommand({
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
  const command = new import_client_sqs2.DeleteMessageCommand({
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
  const command = new import_client_sqs2.ChangeMessageVisibilityCommand({
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
var import_client_sqs3 = require("@aws-sdk/client-sqs");
var import_utils2 = require("@awsless/utils");
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");
var import_crypto = require("crypto");
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
  const list = (0, import_utils2.mockObjectValues)(queues);
  const messageStore = new MessageStore();
  const get = (input) => {
    const name = input.QueueUrl;
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`SQS mock function not defined for: ${name}`);
    }
    return callback;
  };
  const client = (0, import_aws_sdk_client_mock.mockClient)(import_client_sqs3.SQSClient);
  client.on(import_client_sqs3.GetQueueUrlCommand).callsFake((input) => ({ QueueUrl: input.QueueName })).on(import_client_sqs3.SendMessageCommand).callsFake(async (input) => {
    const callback = get(input);
    const messageId = (0, import_crypto.randomUUID)();
    const receiptHandle = (0, import_crypto.randomUUID)();
    messageStore.addMessage(input.QueueUrl, {
      MessageId: messageId,
      ReceiptHandle: receiptHandle,
      Body: input.MessageBody,
      MessageAttributes: input.MessageAttributes
    });
    await (0, import_utils2.nextTick)(callback, {
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
  }).on(import_client_sqs3.SendMessageBatchCommand).callsFake(async (input) => {
    const callback = get(input);
    const records = input.Entries?.map((entry) => {
      const messageId = entry.Id || (0, import_crypto.randomUUID)();
      const receiptHandle = (0, import_crypto.randomUUID)();
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
    await (0, import_utils2.nextTick)(callback, {
      Records: records
    });
  }).on(import_client_sqs3.ReceiveMessageCommand).callsFake(async (input) => {
    const messages = messageStore.receiveMessages(input.QueueUrl, input.MaxNumberOfMessages ?? 1);
    return {
      Messages: messages
    };
  }).on(import_client_sqs3.DeleteMessageCommand).callsFake(async (input) => {
    messageStore.deleteMessage(input.QueueUrl, input.ReceiptHandle);
    return {};
  }).on(import_client_sqs3.ChangeMessageVisibilityCommand).callsFake(async () => {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SQSClient,
  deleteMessage,
  listen,
  mockSQS,
  receiveMessages,
  sendMessage,
  sendMessageBatch,
  sqsClient
});
