// src/clients/dynamodb.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// src/helper.ts
var globalClient = (factory) => {
  let singleton;
  return {
    get() {
      if (!singleton) {
        singleton = factory();
      }
      return singleton;
    },
    set(client) {
      singleton = client;
    }
  };
};

// src/clients/dynamodb.ts
var dynamoDBClient = globalClient(() => {
  return new DynamoDBClient({});
});
var dynamoDBDocumentClient = globalClient(() => {
  return DynamoDBDocumentClient.from(dynamoDBClient.get(), {
    marshallOptions: {
      removeUndefinedValues: true
    }
  });
});

// src/clients/iot.ts
import { IoTDataPlaneClient } from "@aws-sdk/client-iot-data-plane";
var iotClient = globalClient(() => {
  return new IoTDataPlaneClient({});
});

// src/clients/lambda.ts
import { LambdaClient } from "@aws-sdk/client-lambda";
var lambdaClient = globalClient(() => {
  return new LambdaClient({});
});

// src/clients/scheduler.ts
import { SchedulerClient } from "@aws-sdk/client-scheduler";
var schedulerClient = globalClient(() => {
  return new SchedulerClient({});
});

// src/clients/ses.ts
import { SESv2Client } from "@aws-sdk/client-sesv2";
var sesClient = globalClient(() => {
  return new SESv2Client({});
});

// src/clients/sns.ts
import { SNSClient } from "@aws-sdk/client-sns";
var snsClient = globalClient(() => {
  return new SNSClient({});
});

// src/clients/sqs.ts
import { SQSClient } from "@aws-sdk/client-sqs";
var sqsClient = globalClient(() => {
  return new SQSClient({});
});

// src/clients/ssm.ts
import { SSMClient } from "@aws-sdk/client-ssm";
var ssmClient = globalClient(() => {
  return new SSMClient({});
});
export {
  dynamoDBDocumentClient,
  iotClient,
  lambdaClient,
  schedulerClient,
  sesClient,
  snsClient,
  sqsClient,
  ssmClient
};
