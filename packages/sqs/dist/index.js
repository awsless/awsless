// src/client.ts
import { SQSClient } from "@aws-sdk/client-sqs";
import { globalClient } from "@awsless/utils";
var sqsClient = globalClient(() => {
  return new SQSClient({});
});

// src/commands.ts
import {
  SendMessageCommand,
  GetQueueUrlCommand,
  SendMessageBatchCommand
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
  return client.send(command);
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

// src/mock.ts
import {
  SQSClient as SQSClient3,
  SendMessageCommand as SendMessageCommand2,
  GetQueueUrlCommand as GetQueueUrlCommand2,
  SendMessageBatchCommand as SendMessageBatchCommand2
} from "@aws-sdk/client-sqs";
import { mockObjectValues, nextTick } from "@awsless/utils";
import { randomUUID } from "crypto";
import { mockClient } from "aws-sdk-client-mock";
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
  const list = mockObjectValues(queues);
  const get = (input) => {
    const name = input.QueueUrl;
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`SQS mock function not defined for: ${name}`);
    }
    return callback;
  };
  mockClient(SQSClient3).on(GetQueueUrlCommand2).callsFake((input) => ({ QueueUrl: input.QueueName })).on(SendMessageCommand2).callsFake(async (input) => {
    const callback = get(input);
    await nextTick(callback, {
      Records: [
        {
          body: input.MessageBody,
          messageId: randomUUID(),
          messageAttributes: input.MessageAttributes
        }
      ]
    });
  }).on(SendMessageBatchCommand2).callsFake(async (input) => {
    const callback = get(input);
    await nextTick(callback, {
      Records: input.Entries?.map((entry) => ({
        body: entry.MessageBody,
        messageId: entry.Id || randomUUID(),
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
import { json, array, type, string, record } from "@awsless/validate";
import { randomUUID as randomUUID2 } from "crypto";
import "superstruct";
var sqsRecords = (input) => {
  return input.Records.map((item) => item.body);
};
var sqsStruct = (body) => {
  return type({
    Records: array(
      type({
        body: json(body),
        messageId: string(),
        messageAttributes: record(
          string(),
          type({
            dataType: string(),
            stringValue: string()
          })
        )
      })
    )
  });
};
var sqsInput = (records, attributes = {}) => {
  const messageAttributes = {};
  Object.keys(attributes).map((key) => {
    messageAttributes[key] = {
      dataType: "String",
      stringValue: attributes[key]
    };
  });
  return {
    Records: records.map((body) => ({
      messageId: randomUUID2(),
      body: JSON.stringify(body),
      attributes: {
        SentTimestamp: String(Date.now())
      },
      messageAttributes
    }))
  };
};
export {
  mockSQS,
  sendMessage,
  sendMessageBatch,
  sqsClient,
  sqsInput,
  sqsRecords,
  sqsStruct
};
