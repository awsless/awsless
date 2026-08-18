import { ECSClient, ECSClient as ECSClient$1, RunTaskCommand } from "@aws-sdk/client-ecs";
import { globalClient, mockObjectValues, nextTick } from "@awsless/utils";
import { parse, stringify } from "@awsless/json";
import { mockClient } from "aws-sdk-vitest-mock";
//#region src/client.ts
const ecsClient = globalClient(() => {
	return new ECSClient$1({});
});
//#endregion
//#region src/commands.ts
const runTask = async ({ client = ecsClient(), cluster, taskDefinition, subnets, securityGroups, container, payload, assignPublicIp = true }) => {
	const result = await client.send(new RunTaskCommand({
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
				value: stringify(payload)
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
	const list = mockObjectValues(tasks);
	Object.assign(globalList, list);
	if (alreadyMocked) return list;
	mockClient(ECSClient$1).on(RunTaskCommand).callsFake(async (input) => {
		const name = input.taskDefinition ?? "";
		const callback = globalList[name];
		if (!callback) throw new TypeError(`ECS mock function not defined for: ${name}`);
		const payloadEntry = (input.overrides?.containerOverrides?.[0]?.environment ?? []).find((e) => e.name === "PAYLOAD");
		const payload = payloadEntry?.value ? parse(payloadEntry.value) : void 0;
		await nextTick(callback, payload);
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
export { ECSClient, ecsClient, mockEcs, runTask };
