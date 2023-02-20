"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  mockSNS: () => mockSNS,
  publish: () => publish,
  snsClient: () => snsClient,
  snsRecords: () => snsRecords,
  snsStruct: () => snsStruct
});
module.exports = __toCommonJS(src_exports);

// src/commands.ts
var import_client_sns2 = require("@aws-sdk/client-sns");

// src/client.ts
var import_client_sns = require("@aws-sdk/client-sns");
var import_utils = require("@awsless/utils");
var snsClient = (0, import_utils.globalClient)(() => {
  return new import_client_sns.SNSClient({});
});

// src/commands.ts
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
var publish = ({
  client = snsClient(),
  topic,
  subject,
  payload,
  attributes = {},
  region = process.env.AWS_REGION,
  accountId = process.env.AWS_ACCOUNT_ID
}) => {
  const command = new import_client_sns2.PublishCommand({
    TopicArn: `arn:aws:sns:${region}:${accountId}:${topic}`,
    Subject: subject,
    Message: payload ? JSON.stringify(payload) : void 0,
    MessageAttributes: formatAttributes({
      topic,
      ...attributes
    })
  });
  return client.send(command);
};

// src/mock.ts
var import_client_sns3 = require("@aws-sdk/client-sns");
var import_utils2 = require("@awsless/utils");
var import_crypto = require("crypto");
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");
var mockSNS = (topics) => {
  const list = (0, import_utils2.mockObjectValues)(topics);
  (0, import_aws_sdk_client_mock.mockClient)(import_client_sns3.SNSClient).on(import_client_sns3.PublishCommand).callsFake(async (input) => {
    const parts = input.TopicArn?.split(":") || "";
    const topic = parts[parts.length - 1];
    const callback = list[topic];
    if (!callback) {
      throw new TypeError(`Sns mock function not defined for: ${topic}`);
    }
    await (0, import_utils2.nextTick)(callback, {
      Records: [
        {
          Sns: {
            TopicArn: input.TopicArn,
            MessageId: (0, import_crypto.randomUUID)(),
            Timestamp: Date.now(),
            Message: input.Message
          }
        }
      ]
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
var snsRecords = (input) => {
  return input.Records.map(({ Sns: item }) => item.Message);
};
var snsStruct = (message) => {
  return (0, import_validate.type)({
    Records: (0, import_validate.array)(
      (0, import_validate.type)({
        Sns: (0, import_validate.type)({
          TopicArn: (0, import_validate.string)(),
          MessageId: (0, import_validate.string)(),
          Timestamp: (0, import_validate.date)(),
          Message: (0, import_validate.json)(message)
          // MessageAttributes
        })
      })
    )
  });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  mockSNS,
  publish,
  snsClient,
  snsRecords,
  snsStruct
});
