// src/commands.ts
import { PublishCommand } from "@aws-sdk/client-sns";

// src/client.ts
import { SNSClient } from "@aws-sdk/client-sns";
import { globalClient } from "@awsless/utils";
var snsClient = globalClient(() => {
  return new SNSClient({});
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
  const command = new PublishCommand({
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
import { PublishCommand as PublishCommand2, SNSClient as SNSClient2 } from "@aws-sdk/client-sns";
import { mockObjectValues, nextTick } from "@awsless/utils";
import { randomUUID } from "crypto";
import { mockClient } from "aws-sdk-client-mock";
var mockSNS = (topics) => {
  const list = mockObjectValues(topics);
  mockClient(SNSClient2).on(PublishCommand2).callsFake(async (input) => {
    const parts = input.TopicArn?.split(":") || "";
    const topic = parts[parts.length - 1];
    const callback = list[topic];
    if (!callback) {
      throw new TypeError(`Sns mock function not defined for: ${topic}`);
    }
    await nextTick(callback, {
      Records: [
        {
          Sns: {
            TopicArn: input.TopicArn,
            MessageId: randomUUID(),
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
import { json, array, type, string, date } from "@awsless/validate";
var snsRecords = (input) => {
  return input.Records.map(({ Sns: item }) => item.Message);
};
var snsStruct = (message) => {
  return type({
    Records: array(
      type({
        Sns: type({
          TopicArn: string(),
          MessageId: string(),
          Timestamp: date(),
          Message: json(message)
          // MessageAttributes
        })
      })
    )
  });
};
export {
  mockSNS,
  publish,
  snsClient,
  snsRecords,
  snsStruct
};
