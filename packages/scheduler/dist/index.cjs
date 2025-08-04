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
var index_exports = {};
__export(index_exports, {
  mockScheduler: () => mockScheduler,
  schedule: () => schedule,
  schedulerClient: () => schedulerClient
});
module.exports = __toCommonJS(index_exports);

// src/commands.ts
var import_client_scheduler2 = require("@aws-sdk/client-scheduler");
var import_duration = require("@awsless/duration");
var import_json = require("@awsless/json");
var import_crypto = require("crypto");
var import_date_fns = require("date-fns");

// src/client.ts
var import_client_scheduler = require("@aws-sdk/client-scheduler");
var import_utils = require("@awsless/utils");
var schedulerClient = (0, import_utils.globalClient)(() => {
  return new import_client_scheduler.SchedulerClient({});
});

// src/commands.ts
var formatScheduleExpression = (schedule2) => {
  if (schedule2 instanceof import_duration.Duration) {
    const now = /* @__PURE__ */ new Date();
    schedule2 = (0, import_date_fns.addSeconds)(now, (0, import_duration.toSeconds)(schedule2));
  }
  return schedule2.toISOString().split(".").at(0);
};
var schedule = async ({
  client = schedulerClient(),
  name,
  group,
  payload,
  schedule: schedule2,
  idempotentKey,
  roleArn,
  timezone,
  deadLetterArn,
  retryAttempts = 3,
  region = process.env.AWS_REGION,
  accountId = process.env.AWS_ACCOUNT_ID
}) => {
  const command = new import_client_scheduler2.CreateScheduleCommand({
    ClientToken: idempotentKey,
    Name: (0, import_crypto.randomUUID)(),
    GroupName: group,
    ScheduleExpression: `at(${formatScheduleExpression(schedule2)})`,
    ScheduleExpressionTimezone: timezone,
    FlexibleTimeWindow: { Mode: "OFF" },
    ActionAfterCompletion: "DELETE",
    Target: {
      Arn: `arn:aws:lambda:${region}:${accountId}:function:${name}`,
      Input: payload ? (0, import_json.stringify)(payload) : void 0,
      RoleArn: roleArn,
      RetryPolicy: {
        MaximumRetryAttempts: retryAttempts
      },
      ...deadLetterArn ? {
        DeadLetterConfig: {
          Arn: deadLetterArn
        }
      } : {}
    }
  });
  await client.send(command);
};

// src/mock.ts
var import_client_scheduler3 = require("@aws-sdk/client-scheduler");
var import_json2 = require("@awsless/json");
var import_utils2 = require("@awsless/utils");
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");
var mockScheduler = (lambdas) => {
  const list = (0, import_utils2.mockObjectValues)(lambdas);
  (0, import_aws_sdk_client_mock.mockClient)(import_client_scheduler3.SchedulerClient).on(import_client_scheduler3.CreateScheduleCommand).callsFake(async (input) => {
    const parts = input.Target?.Arn?.split(":") ?? "";
    const name = parts[parts.length - 1];
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`Scheduler mock function not defined for: ${name}`);
    }
    const payload = input.Target?.Input ? (0, import_json2.parse)(input.Target.Input) : void 0;
    await (0, import_utils2.nextTick)(callback, payload);
  });
  beforeEach(() => {
    Object.values(list).forEach((fn) => {
      fn.mockClear();
    });
  });
  return list;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  mockScheduler,
  schedule,
  schedulerClient
});
