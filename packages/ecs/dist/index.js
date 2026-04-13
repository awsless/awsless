// src/index.ts
import { ECSClient as ECSClient4 } from "@aws-sdk/client-ecs";

// src/client.ts
import { ECSClient } from "@aws-sdk/client-ecs";
import { globalClient } from "@awsless/utils";
var ecsClient = globalClient(() => {
  return new ECSClient({});
});

// src/commands.ts
import { RunTaskCommand } from "@aws-sdk/client-ecs";
import { stringify } from "@awsless/json";
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
    new RunTaskCommand({
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
                value: stringify(payload)
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
import { ECSClient as ECSClient3, RunTaskCommand as RunTaskCommand2 } from "@aws-sdk/client-ecs";
import { parse } from "@awsless/json";
import { mockObjectValues, nextTick } from "@awsless/utils";
import { mockClient } from "aws-sdk-vitest-mock";
var globalList = {};
var mockEcs = (tasks) => {
  const alreadyMocked = Object.keys(globalList).length > 0;
  const list = mockObjectValues(tasks);
  Object.assign(globalList, list);
  if (alreadyMocked) {
    return list;
  }
  const client = mockClient(ECSClient3);
  client.on(RunTaskCommand2).callsFake(async (input) => {
    const name = input.taskDefinition ?? "";
    const callback = globalList[name];
    if (!callback) {
      throw new TypeError(`ECS mock function not defined for: ${name}`);
    }
    const envVars = input.overrides?.containerOverrides?.[0]?.environment ?? [];
    const payloadEntry = envVars.find((e) => e.name === "PAYLOAD");
    const payload = payloadEntry?.value ? parse(payloadEntry.value) : void 0;
    await nextTick(callback, payload);
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
export {
  ECSClient4 as ECSClient,
  ecsClient,
  mockEcs,
  runTask
};
