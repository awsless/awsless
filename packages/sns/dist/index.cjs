Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let _aws_sdk_client_sns = require("@aws-sdk/client-sns");
let _awsless_utils = require("@awsless/utils");
let crypto = require("crypto");
let aws_sdk_client_mock = require("aws-sdk-client-mock");
//#region src/client.ts
const snsClient = (0, _awsless_utils.globalClient)(() => {
	return new _aws_sdk_client_sns.SNSClient({});
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
	const command = new _aws_sdk_client_sns.PublishCommand({
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
	const list = (0, _awsless_utils.mockObjectValues)(topics);
	Object.assign(globalList, list);
	beforeEach(() => {
		for (const fn of Object.values(list)) fn.mockClear();
	});
	if (alreadyMocked) return list;
	(0, aws_sdk_client_mock.mockClient)(_aws_sdk_client_sns.SNSClient).on(_aws_sdk_client_sns.PublishCommand).callsFake(async (input) => {
		const parts = input.TopicArn?.split(":") ?? "";
		const topic = parts[parts.length - 1] ?? "";
		const callback = globalList[topic];
		if (!callback) throw new TypeError(`Sns mock function not defined for: ${topic}`);
		await (0, _awsless_utils.nextTick)(callback, { Records: [{ Sns: {
			TopicArn: input.TopicArn,
			MessageId: (0, crypto.randomUUID)(),
			Timestamp: (/* @__PURE__ */ new Date()).toISOString(),
			Message: input.Message
		} }] });
	});
	return list;
};
//#endregion
Object.defineProperty(exports, "SNSClient", {
	enumerable: true,
	get: function() {
		return _aws_sdk_client_sns.SNSClient;
	}
});
exports.mockSNS = mockSNS;
exports.publish = publish;
exports.snsClient = snsClient;
