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
var src_exports = {};
__export(src_exports, {
  mockSQS: () => mockSQS,
  sendMessage: () => sendMessage,
  sendMessageBatch: () => sendMessageBatch,
  sqsClient: () => sqsClient,
  sqsStruct: () => sqsStruct
});
module.exports = __toCommonJS(src_exports);

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

// src/mock.ts
var import_client_sqs3 = require("@aws-sdk/client-sqs");
var import_utils2 = require("@awsless/utils");
var import_crypto = require("crypto");
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");
var formatAttributes2 = (attributes) => {
  const list = {};
  for (let key in attributes) {
    list[key] = {
      dataType: attributes[key].DataType,
      stringValue: attributes[key].StringValue
    };
  }
  return list;
};
var mockSQS = (queues) => {
  const list = (0, import_utils2.mockObjectValues)(queues);
  const get = (input) => {
    const name = input.QueueUrl;
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`SQS mock function not defined for: ${name}`);
    }
    return callback;
  };
  (0, import_aws_sdk_client_mock.mockClient)(import_client_sqs3.SQSClient).on(import_client_sqs3.GetQueueUrlCommand).callsFake((input) => ({ QueueUrl: input.QueueName })).on(import_client_sqs3.SendMessageCommand).callsFake(async (input) => {
    const callback = get(input);
    await (0, import_utils2.nextTick)(callback, {
      Records: [
        {
          body: input.MessageBody,
          messageId: (0, import_crypto.randomUUID)(),
          messageAttributes: input.MessageAttributes
        }
      ]
    });
  }).on(import_client_sqs3.SendMessageBatchCommand).callsFake(async (input) => {
    const callback = get(input);
    await (0, import_utils2.nextTick)(callback, {
      Records: input.Entries?.map((entry) => ({
        body: entry.MessageBody,
        messageId: entry.Id || (0, import_crypto.randomUUID)(),
        messageAttributes: formatAttributes2(entry.MessageAttributes)
      }))
    });
  });
  beforeEach(() => {
    Object.values(list).forEach((fn) => {
      fn.mockClear();
    });
  });
  return list;
};

// src/struct.ts
var import_validate = require("@awsless/validate");
var sqsStruct = (body) => {
  return (0, import_validate.coerce)(
    (0, import_validate.array)(body),
    (0, import_validate.type)({ Records: (0, import_validate.array)((0, import_validate.type)({ body: (0, import_validate.string)() })) }),
    ({ Records }) => Records.map((item) => JSON.parse(item.body))
  );
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  mockSQS,
  sendMessage,
  sendMessageBatch,
  sqsClient,
  sqsStruct
});
