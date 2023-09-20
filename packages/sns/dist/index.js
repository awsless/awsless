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
var publish = async ({
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
  await client.send(command);
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
            Timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
import "superstruct";
import { array, type, string, coerce } from "@awsless/validate";
var snsStruct = (message) => {
  return coerce(
    array(message),
    type({
      Records: array(type({
        Sns: type({ Message: string() })
      }))
    }),
    (value) => {
      return value.Records.map((item) => JSON.parse(item.Sns.Message));
    }
  );
};
export {
  mockSNS,
  publish,
  snsClient,
  snsStruct
};
