Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let _aws_sdk_client_ecs = require("@aws-sdk/client-ecs");
let _awsless_utils = require("@awsless/utils");
let _awsless_json = require("@awsless/json");
let aws_sdk_vitest_mock = require("aws-sdk-vitest-mock");
//#region src/client.ts
const ecsClient = (0, _awsless_utils.globalClient)(() => {
	return new _aws_sdk_client_ecs.ECSClient({});
});
//#endregion
//#region src/commands.ts
const runTask = async ({ client = ecsClient(), cluster, taskDefinition, subnets, securityGroups, container, payload, assignPublicIp = true }) => {
	const result = await client.send(new _aws_sdk_client_ecs.RunTaskCommand({
		cluster,
		taskDefinition,
		launchType: "FARGATE",
		networkConfiguration: { awsvpcConfiguration: {
			subnets,
			securityGroups,
			assignPublicIp: assignPublicIp ? "ENABLED" : "DISABLED"
		} },
		overrides: { containerOverrides: [{
			name: container,
			environment: payload !== void 0 ? [{
				name: "PAYLOAD",
				value: (0, _awsless_json.stringify)(payload)
			}] : []
		}] },
		count: 1
	}));
	if (result.failures && result.failures.length > 0) {
		const { reason, detail } = result.failures[0];
		throw new Error(`ECS RunTask failed: ${reason}${detail ? ` - ${detail}` : ""}`);
	}
	return { taskArn: result.tasks?.[0]?.taskArn };
};
//#endregion
//#region src/mock.ts
const globalList = {};
const mockEcs = (tasks) => {
	const alreadyMocked = Object.keys(globalList).length > 0;
	const list = (0, _awsless_utils.mockObjectValues)(tasks);
	Object.assign(globalList, list);
	if (alreadyMocked) return list;
	(0, aws_sdk_vitest_mock.mockClient)(_aws_sdk_client_ecs.ECSClient).on(_aws_sdk_client_ecs.RunTaskCommand).callsFake(async (input) => {
		const name = input.taskDefinition ?? "";
		const callback = globalList[name];
		if (!callback) throw new TypeError(`ECS mock function not defined for: ${name}`);
		const payloadEntry = (input.overrides?.containerOverrides?.[0]?.environment ?? []).find((e) => e.name === "PAYLOAD");
		const payload = payloadEntry?.value ? (0, _awsless_json.parse)(payloadEntry.value) : void 0;
		await (0, _awsless_utils.nextTick)(callback, payload);
		return {
			tasks: [{ taskArn: `arn:aws:ecs:us-east-1:000000000000:task/mock/${name}` }],
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
//#endregion
Object.defineProperty(exports, "ECSClient", {
	enumerable: true,
	get: function() {
		return _aws_sdk_client_ecs.ECSClient;
	}
});
exports.ecsClient = ecsClient;
exports.mockEcs = mockEcs;
exports.runTask = runTask;
