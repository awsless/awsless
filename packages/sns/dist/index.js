import { PublishCommand, SNSClient, SNSClient as SNSClient$1 } from "@aws-sdk/client-sns";
import { globalClient, mockObjectValues, nextTick } from "@awsless/utils";
import { mockClient } from "aws-sdk-client-mock";
import { randomUUID } from "crypto";
//#region src/client.ts
const snsClient = globalClient(() => {
	return new SNSClient$1({});
});
//#endregion
//#region src/commands.ts
const formatAttributes = (attributes) => {
	const list = {};
	for (let key in attributes) list[key] = {
		DataType: "String",
		StringValue: attributes[key]
	};
	return list;
};
const publish = async ({ client = snsClient(), topic, subject, payload, attributes = {}, region = process.env.AWS_REGION, accountId = process.env.AWS_ACCOUNT_ID }) => {
	const command = new PublishCommand({
		TopicArn: `arn:aws:sns:${region}:${accountId}:${topic}`,
		Subject: subject,
		Message: payload,
		MessageAttributes: formatAttributes({
			topic,
			...attributes
		})
	});
	await client.send(command);
};
//#endregion
//#region src/mock.ts
const globalList = {};
const mockSNS = (topics) => {
	const alreadyMocked = Object.keys(globalList).length > 0;
	const list = mockObjectValues(topics);
	Object.assign(globalList, list);
	if (alreadyMocked) return list;
	mockClient(SNSClient$1).on(PublishCommand).callsFake(async (input) => {
		const parts = input.TopicArn?.split(":") ?? "";
		const topic = parts[parts.length - 1] ?? "";
		const callback = globalList[topic];
		if (!callback) throw new TypeError(`Sns mock function not defined for: ${topic}`);
		await nextTick(callback, { Records: [{ Sns: {
			TopicArn: input.TopicArn,
			MessageId: randomUUID(),
			Timestamp: (/* @__PURE__ */ new Date()).toISOString(),
			Message: input.Message
		} }] });
	});
	beforeEach(() => {
		Object.values(list).forEach((fn) => {
			fn.mockClear();
		});
	});
	return list;
};
//#endregion
export { SNSClient, mockSNS, publish, snsClient };
