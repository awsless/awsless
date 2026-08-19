Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let _aws_sdk_client_sqs = require("@aws-sdk/client-sqs");
let _awsless_utils = require("@awsless/utils");
let _awsless_duration = require("@awsless/duration");
let _awsless_json = require("@awsless/json");
let chunk = require("chunk");
chunk = __toESM(chunk, 1);
let crypto = require("crypto");
let aws_sdk_vitest_mock = require("aws-sdk-vitest-mock");
//#region src/client.ts
const sqsClient = (0, _awsless_utils.globalClient)(() => {
	return new _aws_sdk_client_sqs.SQSClient({});
});
//#endregion
//#region src/commands.ts
const encodeAttributes = (attributes) => {
	const list = {};
	for (const key in attributes) list[key] = {
		DataType: "String",
		StringValue: attributes[key]
	};
	return list;
};
const decodeAttributes = (attributes) => {
	const list = {};
	for (const key in attributes) list[key] = attributes[key]?.StringValue;
	return list;
};
const getQueueUrl = async (queue, client = sqsClient()) => {
	if (queue.includes("://")) return queue;
	const command = new _aws_sdk_client_sqs.GetQueueUrlCommand({ QueueName: queue });
	return (await client.send(command)).QueueUrl;
};
const cache = /* @__PURE__ */ new Map();
const getCachedQueueUrl = (queue, client = sqsClient()) => {
	if (!cache.has(queue)) cache.set(queue, getQueueUrl(queue, client));
	return cache.get(queue);
};
const sendMessage = async ({ client = sqsClient(), queue, payload, delay, groupId, deduplicationId, attributes = {} }) => {
	const url = await getCachedQueueUrl(queue, client);
	const command = new _aws_sdk_client_sqs.SendMessageCommand({
		QueueUrl: url,
		MessageBody: (0, _awsless_json.stringify)(payload),
		DelaySeconds: delay,
		MessageGroupId: groupId,
		MessageDeduplicationId: deduplicationId,
		MessageAttributes: encodeAttributes({
			queue,
			...attributes
		})
	});
	await client.send(command);
};
const sendMessageBatch = async ({ client = sqsClient(), queue, items }) => {
	const url = await getCachedQueueUrl(queue, client);
	await Promise.all((0, chunk.default)(items, 10).map(async (batch) => {
		const command = new _aws_sdk_client_sqs.SendMessageBatchCommand({
			QueueUrl: url,
			Entries: batch.map(({ payload, delay, groupId, deduplicationId, attributes = {} }, id) => ({
				Id: String(id),
				MessageBody: (0, _awsless_json.stringify)(payload),
				DelaySeconds: delay,
				MessageGroupId: groupId,
				MessageDeduplicationId: deduplicationId,
				MessageAttributes: encodeAttributes({
					queue,
					...attributes
				})
			}))
		});
		return client.send(command);
	}));
};
const receiveMessages = async ({ client = sqsClient(), queue, maxMessages = 10, waitTime = (0, _awsless_duration.seconds)(20), visibilityTimeout, abortSignal }) => {
	const url = await getCachedQueueUrl(queue, client);
	const command = new _aws_sdk_client_sqs.ReceiveMessageCommand({
		QueueUrl: url,
		MaxNumberOfMessages: maxMessages,
		WaitTimeSeconds: (0, _awsless_duration.toSeconds)(waitTime),
		VisibilityTimeout: (0, _awsless_duration.toSeconds)(visibilityTimeout),
		MessageAttributeNames: ["All"]
	});
	return (await client.send(command, { abortSignal })).Messages ?? [];
};
const deleteMessage = async ({ client = sqsClient(), queue, receiptHandle }) => {
	const url = await getCachedQueueUrl(queue, client);
	const command = new _aws_sdk_client_sqs.DeleteMessageCommand({
		QueueUrl: url,
		ReceiptHandle: receiptHandle
	});
	await client.send(command);
};
const deleteMessageBatch = async ({ client = sqsClient(), queue, receiptHandles }) => {
	const url = await getCachedQueueUrl(queue, client);
	await Promise.all((0, chunk.default)(receiptHandles, 10).map(async (batch) => {
		const command = new _aws_sdk_client_sqs.DeleteMessageBatchCommand({
			QueueUrl: url,
			Entries: batch.map((receiptHandle, index) => ({
				Id: String(index),
				ReceiptHandle: receiptHandle
			}))
		});
		await client.send(command);
	}));
};
const changeMessageVisibility = async ({ client = sqsClient(), queue, receiptHandle, visibilityTimeout }) => {
	const url = await getCachedQueueUrl(queue, client);
	const command = new _aws_sdk_client_sqs.ChangeMessageVisibilityCommand({
		QueueUrl: url,
		ReceiptHandle: receiptHandle,
		VisibilityTimeout: (0, _awsless_duration.toSeconds)(visibilityTimeout)
	});
	await client.send(command);
};
async function* subscribe({ client = sqsClient(), queue, maxMessages = 10, waitTime, visibilityTimeout, signal }) {
	while (!signal?.aborted) {
		let messages;
		try {
			messages = await receiveMessages({
				client,
				queue,
				maxMessages,
				waitTime,
				visibilityTimeout,
				abortSignal: signal
			});
		} catch (error) {
			if (signal?.aborted) return;
			console.error(JSON.stringify({
				message: "Error polling queue",
				error: error instanceof Error ? {
					...error,
					name: error.name,
					message: error.message
				} : error
			}));
			await new Promise((resolve) => setTimeout(resolve, 5e3));
			continue;
		}
		const parsed = [];
		for (const message of messages) try {
			parsed.push({
				record: {
					payload: (0, _awsless_json.parse)(message.Body),
					attributes: decodeAttributes(message.MessageAttributes)
				},
				receiptHandle: message.ReceiptHandle
			});
		} catch (error) {
			console.error(JSON.stringify({
				message: "Error processing message body",
				error
			}));
		}
		if (parsed.length === 0) continue;
		yield parsed.map((p) => p.record);
		try {
			await deleteMessageBatch({
				client,
				queue,
				receiptHandles: parsed.map((p) => p.receiptHandle)
			});
		} catch (error) {
			console.error(JSON.stringify({
				message: "Error deleting messages",
				error
			}));
		}
	}
}
//#endregion
//#region src/mock.ts
const formatAttributes = (attributes) => {
	const list = {};
	for (const [key, attr] of Object.entries(attributes ?? {})) list[key] = {
		dataType: attr.DataType,
		stringValue: attr.StringValue
	};
	return list;
};
var MessageStore = class {
	queues = {};
	addMessage(queueUrl, message) {
		if (!this.queues[queueUrl]) this.queues[queueUrl] = [];
		this.queues[queueUrl].push({ message });
	}
	receiveMessages(queueUrl, maxMessages, timeout = 1) {
		return (this.queues[queueUrl] ?? []).filter((entry) => !entry.invisible || Date.now() > entry.invisible).slice(0, maxMessages).map((entry) => {
			entry.invisible = Date.now() + timeout * 1e3;
			return entry.message;
		});
	}
	deleteMessage(queueUrl, receiptHandle) {
		if (this.queues[queueUrl]) this.queues[queueUrl] = this.queues[queueUrl].filter((entry) => entry.message.ReceiptHandle !== receiptHandle);
	}
	changeVisibility(queueUrl, receiptHandle, timeout) {
		const messages = this.queues[queueUrl] ?? [];
		for (const entry of messages) if (entry.message.ReceiptHandle === receiptHandle) entry.invisible = Date.now() + timeout * 1e3;
	}
	clear() {
		this.queues = {};
	}
};
const mockSQS = (queues) => {
	const list = (0, _awsless_utils.mockObjectValues)(queues);
	const messageStore = new MessageStore();
	const get = (input) => {
		const name = input.QueueUrl;
		const callback = list[name];
		if (!callback) throw new TypeError(`SQS mock function not defined for: ${name}`);
		return callback;
	};
	const client = (0, aws_sdk_vitest_mock.mockClient)(_aws_sdk_client_sqs.SQSClient);
	client.on(_aws_sdk_client_sqs.GetQueueUrlCommand).callsFake(async (input) => ({ QueueUrl: input.QueueName }));
	client.on(_aws_sdk_client_sqs.SendMessageCommand).callsFake(async (input) => {
		const callback = get(input);
		const messageId = (0, crypto.randomUUID)();
		const receiptHandle = (0, crypto.randomUUID)();
		messageStore.addMessage(input.QueueUrl, {
			MessageId: messageId,
			ReceiptHandle: receiptHandle,
			Body: input.MessageBody,
			MessageAttributes: input.MessageAttributes
		});
		await (0, _awsless_utils.nextTick)(callback, { Records: [{
			body: input.MessageBody,
			messageId,
			messageAttributes: input.MessageAttributes
		}] });
		return { MessageId: messageId };
	});
	client.on(_aws_sdk_client_sqs.SendMessageBatchCommand).callsFake(async (input) => {
		const callback = get(input);
		const records = input.Entries?.map((entry) => {
			const messageId = entry.Id || (0, crypto.randomUUID)();
			const receiptHandle = (0, crypto.randomUUID)();
			messageStore.addMessage(input.QueueUrl, {
				MessageId: messageId,
				ReceiptHandle: receiptHandle,
				Body: entry.MessageBody,
				MessageAttributes: entry.MessageAttributes
			});
			return {
				body: entry.MessageBody,
				messageId,
				messageAttributes: formatAttributes(entry.MessageAttributes)
			};
		});
		await (0, _awsless_utils.nextTick)(callback, { Records: records });
		return {};
	});
	client.on(_aws_sdk_client_sqs.ReceiveMessageCommand).callsFake(async (input) => {
		const deadline = Date.now() + (input.WaitTimeSeconds || 1) * 1e3;
		while (Date.now() < deadline) {
			const messages = messageStore.receiveMessages(input.QueueUrl, input.MaxNumberOfMessages ?? 1, input.VisibilityTimeout);
			if (messages.length > 0) return { Messages: messages };
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
		return { Messages: [] };
	});
	client.on(_aws_sdk_client_sqs.DeleteMessageCommand).callsFake(async (input) => {
		messageStore.deleteMessage(input.QueueUrl, input.ReceiptHandle);
		return {};
	});
	client.on(_aws_sdk_client_sqs.DeleteMessageBatchCommand).callsFake(async (input) => {
		for (const entry of input.Entries ?? []) messageStore.deleteMessage(input.QueueUrl, entry.ReceiptHandle);
		return {};
	});
	client.on(_aws_sdk_client_sqs.ChangeMessageVisibilityCommand).callsFake(async (input) => {
		messageStore.changeVisibility(input.QueueUrl, input.ReceiptHandle, input.VisibilityTimeout);
		return {};
	});
	beforeEach(() => {
		Object.values(list).forEach((fn) => {
			fn.mockClear();
		});
	});
	beforeAll(() => {
		messageStore.clear();
	});
	return list;
};
//#endregion
Object.defineProperty(exports, "SQSClient", {
	enumerable: true,
	get: function() {
		return _aws_sdk_client_sqs.SQSClient;
	}
});
exports.changeMessageVisibility = changeMessageVisibility;
exports.deleteMessage = deleteMessage;
exports.deleteMessageBatch = deleteMessageBatch;
exports.getCachedQueueUrl = getCachedQueueUrl;
exports.getQueueUrl = getQueueUrl;
exports.mockSQS = mockSQS;
exports.receiveMessages = receiveMessages;
exports.sendMessage = sendMessage;
exports.sendMessageBatch = sendMessageBatch;
exports.sqsClient = sqsClient;
exports.subscribe = subscribe;
