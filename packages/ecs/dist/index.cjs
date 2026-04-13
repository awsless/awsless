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
  ECSClient: () => import_client_ecs4.ECSClient,
  ecsClient: () => ecsClient,
  mockEcs: () => mockEcs,
  runTask: () => runTask
});
module.exports = __toCommonJS(index_exports);
var import_client_ecs4 = require("@aws-sdk/client-ecs");

// src/client.ts
var import_client_ecs = require("@aws-sdk/client-ecs");
var import_utils = require("@awsless/utils");
var ecsClient = (0, import_utils.globalClient)(() => {
  return new import_client_ecs.ECSClient({});
});

// src/commands.ts
var import_client_ecs2 = require("@aws-sdk/client-ecs");
var import_json = require("@awsless/json");
var runTask = async ({
  client = ecsClient(),
  cluster,
  taskDefinition,
  subnets,
  securityGroups,
  container,
  payload,
  assignPublicIp = true
}) => {
  const result = await client.send(
    new import_client_ecs2.RunTaskCommand({
      cluster,
      taskDefinition,
      launchType: "FARGATE",
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets,
          securityGroups,
          assignPublicIp: assignPublicIp ? "ENABLED" : "DISABLED"
        }
      },
      overrides: {
        containerOverrides: [
          {
            name: container,
            environment: payload !== void 0 ? [
              {
                name: "PAYLOAD",
                value: (0, import_json.stringify)(payload)
              }
            ] : []
          }
        ]
      },
      count: 1
    })
  );
  if (result.failures && result.failures.length > 0) {
    const { reason, detail } = result.failures[0];
    throw new Error(`ECS RunTask failed: ${reason}${detail ? ` - ${detail}` : ""}`);
  }
  return { taskArn: result.tasks?.[0]?.taskArn };
};

// src/mock.ts
var import_client_ecs3 = require("@aws-sdk/client-ecs");
var import_json2 = require("@awsless/json");
var import_utils2 = require("@awsless/utils");
var import_aws_sdk_vitest_mock = require("aws-sdk-vitest-mock");
var globalList = {};
var mockEcs = (tasks) => {
  const alreadyMocked = Object.keys(globalList).length > 0;
  const list = (0, import_utils2.mockObjectValues)(tasks);
  Object.assign(globalList, list);
  if (alreadyMocked) {
    return list;
  }
  const client = (0, import_aws_sdk_vitest_mock.mockClient)(import_client_ecs3.ECSClient);
  client.on(import_client_ecs3.RunTaskCommand).callsFake(async (input) => {
    const name = input.taskDefinition ?? "";
    const callback = globalList[name];
    if (!callback) {
      throw new TypeError(`ECS mock function not defined for: ${name}`);
    }
    const envVars = input.overrides?.containerOverrides?.[0]?.environment ?? [];
    const payloadEntry = envVars.find((e) => e.name === "PAYLOAD");
    const payload = payloadEntry?.value ? (0, import_json2.parse)(payloadEntry.value) : void 0;
    await (0, import_utils2.nextTick)(callback, payload);
    return {
      tasks: [
        {
          taskArn: `arn:aws:ecs:us-east-1:000000000000:task/mock/${name}`
        }
      ],
      failures: []
    };
  });
  beforeEach && beforeEach(() => {
    Object.values(globalList).forEach((fn) => {
      fn.mockClear();
    });
  });
  return list;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ECSClient,
  ecsClient,
  mockEcs,
  runTask
});
