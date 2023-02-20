// src/commands.ts
import { CreateScheduleCommand, DeleteScheduleCommand } from "@aws-sdk/client-scheduler";

// src/client.ts
import { SchedulerClient } from "@aws-sdk/client-scheduler";
import { globalClient } from "@awsless/utils";
var schedulerClient = globalClient(() => {
  return new SchedulerClient({});
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
  const command = new CreateScheduleCommand({
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
  const command = new DeleteScheduleCommand({
    ClientToken: idempotentKey,
    Name: idempotentKey
  });
  return client.send(command);
};

// src/mock.ts
import {
  SchedulerClient as SchedulerClient2,
  CreateScheduleCommand as CreateScheduleCommand2,
  DeleteScheduleCommand as DeleteScheduleCommand2
} from "@aws-sdk/client-scheduler";
import { mockObjectValues, nextTick } from "@awsless/utils";
import { mockClient } from "aws-sdk-client-mock";
var mockScheduler = (lambdas) => {
  const list = mockObjectValues(lambdas);
  mockClient(SchedulerClient2).on(CreateScheduleCommand2).callsFake(async (input) => {
    const parts = input.Target.Arn.split(":");
    const name = parts[parts.length - 1];
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`Scheduler mock function not defined for: ${name}`);
    }
    const payload = input.Target?.Input ? JSON.parse(input.Target.Input) : void 0;
    await nextTick(callback, payload);
  }).on(DeleteScheduleCommand2).resolves({});
  beforeEach(() => {
    Object.values(list).forEach((fn) => {
      fn.mockClear();
    });
  });
  return list;
};
export {
  deleteSchedule,
  mockScheduler,
  schedule,
  schedulerClient
};
