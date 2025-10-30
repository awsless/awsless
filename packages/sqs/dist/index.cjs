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
  changeMessageVisibility: () => changeMessageVisibility,
  deleteMessage: () => deleteMessage,
  mockSQS: () => mockSQS,
  receiveMessages: () => receiveMessages,
  sendMessage: () => sendMessage,
  sendMessageBatch: () => sendMessageBatch,
  sqsClient: () => sqsClient,
  subscribe: () => subscribe
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
var import_duration = require("@awsless/duration");
var import_json = require("@awsless/json");
var import_chunk = __toESM(require("chunk"), 1);
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
    MessageBody: (0, import_json.stringify)(payload),
    DelaySeconds: delay,
    MessageAttributes: encodeAttributes({ queue, ...attributes })
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
          MessageBody: (0, import_json.stringify)(payload),
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
  waitTime = (0, import_duration.seconds)(20),
  visibilityTimeout,
  abortSignal
}) => {
  const url = await getCachedQueueUrl(client, queue);
  const command = new import_client_sqs2.ReceiveMessageCommand({
    QueueUrl: url,
    MaxNumberOfMessages: maxMessages,
    WaitTimeSeconds: (0, import_duration.toSeconds)(waitTime),
    VisibilityTimeout: (0, import_duration.toSeconds)(visibilityTimeout),
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
    VisibilityTimeout: (0, import_duration.toSeconds)(visibilityTimeout)
  });
  await client.send(command);
};
var subscribe = ({
  client = sqsClient(),
  queue,
  maxMessages,
  waitTime,
  visibilityTimeout,
  autoExtendVisibility,
  handleMessage
}) => {
  let subscribed = true;
  const abortController = new AbortController();
  const autoExtensionInterval = autoExtendVisibility ? (0, import_duration.toMilliSeconds)(visibilityTimeout) / 2 : void 0;
  const startVisibilityExtension = (receiptHandle) => {
    const interval = setInterval(async () => {
      if (!subscribed) {
        clearInterval(interval);
        return;
      }
      await changeMessageVisibility({
        client,
        queue,
        receiptHandle,
        visibilityTimeout
      });
    }, autoExtensionInterval);
    return () => clearInterval(interval);
  };
  const poll = async () => {
    try {
      const messages = await receiveMessages({
        client,
        queue,
        maxMessages,
        waitTime,
        visibilityTimeout,
        abortSignal: abortController.signal
      });
      await Promise.all(
        messages.map(async (message) => {
          let stopExtension;
          if (autoExtendVisibility) {
            stopExtension = startVisibilityExtension(message.ReceiptHandle);
          }
          let body;
          try {
            body = {
              payload: (0, import_json.parse)(message.Body),
              attributes: decodeAttributes(message.MessageAttributes)
            };
          } catch (error) {
            console.error(
              JSON.stringify({
                message: "Error processing message body",
                error
              })
            );
            return;
          }
          try {
            await handleMessage(body);
          } catch (error) {
            console.error(
              JSON.stringify({
                message: "Error processing message",
                error
              })
            );
            return;
          } finally {
            stopExtension?.();
          }
          try {
            await deleteMessage({
              client,
              queue,
              receiptHandle: message.ReceiptHandle
            });
          } catch (error) {
            console.error(
              JSON.stringify({
                message: "Error deleting message",
                error
              })
            );
            throw error;
          }
        })
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "Error polling queue",
          error
        })
      );
    }
    if (subscribed) {
      poll();
    }
  };
  poll();
  return () => {
    subscribed = false;
    abortController.abort();
  };
};

// src/mock.ts
var import_client_sqs3 = require("@aws-sdk/client-sqs");
var import_utils2 = require("@awsless/utils");
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");
var import_crypto = require("crypto");
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
        messageAttributes: formatAttributes(entry.MessageAttributes)
      };
    });
    await (0, import_utils2.nextTick)(callback, {
      Records: records
    });
  }).on(import_client_sqs3.ReceiveMessageCommand).callsFake(async (input) => {
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
  }).on(import_client_sqs3.DeleteMessageCommand).callsFake(async (input) => {
    messageStore.deleteMessage(input.QueueUrl, input.ReceiptHandle);
    return {};
  }).on(import_client_sqs3.ChangeMessageVisibilityCommand).callsFake(async (input) => {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SQSClient,
  changeMessageVisibility,
  deleteMessage,
  mockSQS,
  receiveMessages,
  sendMessage,
  sendMessageBatch,
  sqsClient,
  subscribe
});
