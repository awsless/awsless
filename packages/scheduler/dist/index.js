// src/commands.ts
import { CreateScheduleCommand } from "@aws-sdk/client-scheduler";
import { Duration, toSeconds } from "@awsless/duration";
import { stringify } from "@awsless/json";
import { randomUUID } from "crypto";
import { addSeconds } from "date-fns";

// src/client.ts
import { SchedulerClient } from "@aws-sdk/client-scheduler";
import { globalClient } from "@awsless/utils";
var schedulerClient = globalClient(() => {
  return new SchedulerClient({});
});

// src/commands.ts
var formatScheduleExpression = (schedule2) => {
  if (schedule2 instanceof Duration) {
    const now = /* @__PURE__ */ new Date();
    schedule2 = addSeconds(now, toSeconds(schedule2));
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
  const command = new CreateScheduleCommand({
    ClientToken: idempotentKey,
    Name: randomUUID(),
    GroupName: group,
    ScheduleExpression: `at(${formatScheduleExpression(schedule2)})`,
    ScheduleExpressionTimezone: timezone,
    FlexibleTimeWindow: { Mode: "OFF" },
    ActionAfterCompletion: "DELETE",
    Target: {
      Arn: `arn:aws:lambda:${region}:${accountId}:function:${name}`,
      Input: payload ? stringify(payload) : void 0,
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
import { CreateScheduleCommand as CreateScheduleCommand2, SchedulerClient as SchedulerClient3 } from "@aws-sdk/client-scheduler";
import { parse } from "@awsless/json";
import { mockObjectValues, nextTick } from "@awsless/utils";
import { mockClient } from "aws-sdk-client-mock";
var mockScheduler = (lambdas) => {
  const list = mockObjectValues(lambdas);
  mockClient(SchedulerClient3).on(CreateScheduleCommand2).callsFake(async (input) => {
    const parts = input.Target?.Arn?.split(":") ?? "";
    const name = parts[parts.length - 1];
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`Scheduler mock function not defined for: ${name}`);
    }
    const payload = input.Target?.Input ? parse(input.Target.Input) : void 0;
    await nextTick(callback, payload);
  });
  beforeEach(() => {
    Object.values(list).forEach((fn) => {
      fn.mockClear();
    });
  });
  return list;
};
export {
  mockScheduler,
  schedule,
  schedulerClient
};
