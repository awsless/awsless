import { randomUUID } from "crypto";
import { CreateScheduleCommand, SchedulerClient } from "@aws-sdk/client-scheduler";
import { Duration, toSeconds } from "@awsless/duration";
import { parse, stringify } from "@awsless/json";
import { addSeconds } from "date-fns";
import { globalClient, mockObjectValues, nextTick } from "@awsless/utils";
import { mockClient } from "aws-sdk-client-mock";
//#region src/client.ts
const schedulerClient = globalClient(() => {
	return new SchedulerClient({});
});
//#endregion
//#region src/commands.ts
const formatScheduleExpression = (schedule) => {
	if (schedule instanceof Duration) schedule = addSeconds(/* @__PURE__ */ new Date(), toSeconds(schedule));
	return schedule.toISOString().split(".").at(0);
};
const schedule = async ({ client = schedulerClient(), name, group, payload, schedule, idempotentKey, roleArn, timezone, deadLetterArn, retryAttempts = 3, region = process.env.AWS_REGION, accountId = process.env.AWS_ACCOUNT_ID }) => {
	const command = new CreateScheduleCommand({
		ClientToken: idempotentKey,
		Name: randomUUID(),
		GroupName: group,
		ScheduleExpression: `at(${formatScheduleExpression(schedule)})`,
		ScheduleExpressionTimezone: timezone,
		FlexibleTimeWindow: { Mode: "OFF" },
		ActionAfterCompletion: "DELETE",
		Target: {
			Arn: `arn:aws:lambda:${region}:${accountId}:function:${name}`,
			Input: payload ? stringify(payload) : void 0,
			RoleArn: roleArn,
			RetryPolicy: { MaximumRetryAttempts: retryAttempts },
			...deadLetterArn ? { DeadLetterConfig: { Arn: deadLetterArn } } : {}
		}
	});
	await client.send(command);
};
//#endregion
//#region src/mock.ts
const mockScheduler = (lambdas) => {
	const list = mockObjectValues(lambdas);
	mockClient(SchedulerClient).on(CreateScheduleCommand).callsFake(async (input) => {
		const parts = input.Target?.Arn?.split(":") ?? "";
		const name = parts[parts.length - 1];
		const callback = list[name];
		if (!callback) throw new TypeError(`Scheduler mock function not defined for: ${name}`);
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
//#endregion
export { mockScheduler, schedule, schedulerClient };
