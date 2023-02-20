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
  deleteSchedule: () => deleteSchedule,
  mockScheduler: () => mockScheduler,
  schedule: () => schedule,
  schedulerClient: () => schedulerClient
});
module.exports = __toCommonJS(src_exports);

// src/commands.ts
var import_client_scheduler2 = require("@aws-sdk/client-scheduler");

// src/client.ts
var import_client_scheduler = require("@aws-sdk/client-scheduler");
var import_utils = require("@awsless/utils");
var schedulerClient = (0, import_utils.globalClient)(() => {
  return new import_client_scheduler.SchedulerClient({});
});

// src/commands.ts
var schedule = async ({
  client = schedulerClient(),
  lambda,
  payload,
  date,
  idempotentKey,
  roleArn,
  timezone,
  region = process.env.REGION,
  accountId = process.env.AWS_ACCOUNT_ID
}) => {
  const command = new import_client_scheduler2.CreateScheduleCommand({
    ClientToken: idempotentKey,
    Name: idempotentKey,
    ScheduleExpression: `at(${date.toISOString().split(".")[0]})`,
    ScheduleExpressionTimezone: timezone || void 0,
    FlexibleTimeWindow: { Mode: "OFF" },
    Target: {
      Arn: `arn:aws:lambda:${region}:${accountId}:function:${lambda}`,
      Input: payload ? JSON.stringify(payload) : void 0,
      RoleArn: roleArn
    }
  });
  return client.send(command);
};
var deleteSchedule = ({ client = schedulerClient(), idempotentKey }) => {
  const command = new import_client_scheduler2.DeleteScheduleCommand({
    ClientToken: idempotentKey,
    Name: idempotentKey
  });
  return client.send(command);
};

// src/mock.ts
var import_client_scheduler3 = require("@aws-sdk/client-scheduler");
var import_utils2 = require("@awsless/utils");
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");
var mockScheduler = (lambdas) => {
  const list = (0, import_utils2.mockObjectValues)(lambdas);
  (0, import_aws_sdk_client_mock.mockClient)(import_client_scheduler3.SchedulerClient).on(import_client_scheduler3.CreateScheduleCommand).callsFake(async (input) => {
    const parts = input.Target.Arn.split(":");
    const name = parts[parts.length - 1];
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`Scheduler mock function not defined for: ${name}`);
    }
    const payload = input.Target?.Input ? JSON.parse(input.Target.Input) : void 0;
    await (0, import_utils2.nextTick)(callback, payload);
  }).on(import_client_scheduler3.DeleteScheduleCommand).resolves({});
  beforeEach(() => {
    Object.values(list).forEach((fn) => {
      fn.mockClear();
    });
  });
  return list;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  deleteSchedule,
  mockScheduler,
  schedule,
  schedulerClient
});
