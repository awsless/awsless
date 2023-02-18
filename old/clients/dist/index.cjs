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
  dynamoDBDocumentClient: () => dynamoDBDocumentClient,
  iotClient: () => iotClient,
  lambdaClient: () => lambdaClient,
  schedulerClient: () => schedulerClient,
  sesClient: () => sesClient,
  snsClient: () => snsClient,
  sqsClient: () => sqsClient,
  ssmClient: () => ssmClient
});
module.exports = __toCommonJS(src_exports);

// src/clients/dynamodb.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");

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
  return new import_client_dynamodb.DynamoDBClient({});
});
var dynamoDBDocumentClient = globalClient(() => {
  return import_lib_dynamodb.DynamoDBDocumentClient.from(dynamoDBClient.get(), {
    marshallOptions: {
      removeUndefinedValues: true
    }
  });
});

// src/clients/iot.ts
var import_client_iot_data_plane = require("@aws-sdk/client-iot-data-plane");
var iotClient = globalClient(() => {
  return new import_client_iot_data_plane.IoTDataPlaneClient({});
});

// src/clients/lambda.ts
var import_client_lambda = require("@aws-sdk/client-lambda");
var lambdaClient = globalClient(() => {
  return new import_client_lambda.LambdaClient({});
});

// src/clients/scheduler.ts
var import_client_scheduler = require("@aws-sdk/client-scheduler");
var schedulerClient = globalClient(() => {
  return new import_client_scheduler.SchedulerClient({});
});

// src/clients/ses.ts
var import_client_sesv2 = require("@aws-sdk/client-sesv2");
var sesClient = globalClient(() => {
  return new import_client_sesv2.SESv2Client({});
});

// src/clients/sns.ts
var import_client_sns = require("@aws-sdk/client-sns");
var snsClient = globalClient(() => {
  return new import_client_sns.SNSClient({});
});

// src/clients/sqs.ts
var import_client_sqs = require("@aws-sdk/client-sqs");
var sqsClient = globalClient(() => {
  return new import_client_sqs.SQSClient({});
});

// src/clients/ssm.ts
var import_client_ssm = require("@aws-sdk/client-ssm");
var ssmClient = globalClient(() => {
  return new import_client_ssm.SSMClient({});
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  dynamoDBDocumentClient,
  iotClient,
  lambdaClient,
  schedulerClient,
  sesClient,
  snsClient,
  sqsClient,
  ssmClient
});
