Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let crypto = require("crypto");
let _aws_sdk_client_scheduler = require("@aws-sdk/client-scheduler");
let _awsless_duration = require("@awsless/duration");
let _awsless_json = require("@awsless/json");
let date_fns = require("date-fns");
let _awsless_utils = require("@awsless/utils");
let aws_sdk_client_mock = require("aws-sdk-client-mock");
//#region src/client.ts
const schedulerClient = (0, _awsless_utils.globalClient)(() => {
	return new _aws_sdk_client_scheduler.SchedulerClient({});
});
//#endregion
//#region src/commands.ts
const formatScheduleExpression = (schedule) => {
	if (schedule instanceof _awsless_duration.Duration) schedule = (0, date_fns.addSeconds)(/* @__PURE__ */ new Date(), (0, _awsless_duration.toSeconds)(schedule));
	return schedule.toISOString().split(".").at(0);
};
const schedule = async ({ client = schedulerClient(), name, group, payload, schedule, idempotentKey, roleArn, timezone, deadLetterArn, retryAttempts = 3, region = process.env.AWS_REGION, accountId = process.env.AWS_ACCOUNT_ID }) => {
	const command = new _aws_sdk_client_scheduler.CreateScheduleCommand({
		ClientToken: idempotentKey,
		Name: (0, crypto.randomUUID)(),
		GroupName: group,
		ScheduleExpression: `at(${formatScheduleExpression(schedule)})`,
		ScheduleExpressionTimezone: timezone,
		FlexibleTimeWindow: { Mode: "OFF" },
		ActionAfterCompletion: "DELETE",
		Target: {
			Arn: `arn:aws:lambda:${region}:${accountId}:function:${name}`,
			Input: payload ? (0, _awsless_json.stringify)(payload) : void 0,
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
	const list = (0, _awsless_utils.mockObjectValues)(lambdas);
	(0, aws_sdk_client_mock.mockClient)(_aws_sdk_client_scheduler.SchedulerClient).on(_aws_sdk_client_scheduler.CreateScheduleCommand).callsFake(async (input) => {
		const parts = input.Target?.Arn?.split(":") ?? "";
		const name = parts[parts.length - 1];
		const callback = list[name];
		if (!callback) throw new TypeError(`Scheduler mock function not defined for: ${name}`);
		const payload = input.Target?.Input ? (0, _awsless_json.parse)(input.Target.Input) : void 0;
		await (0, _awsless_utils.nextTick)(callback, payload);
	});
	beforeEach(() => {
		Object.values(list).forEach((fn) => {
			fn.mockClear();
		});
	});
	return list;
};
//#endregion
exports.mockScheduler = mockScheduler;
exports.schedule = schedule;
exports.schedulerClient = schedulerClient;
