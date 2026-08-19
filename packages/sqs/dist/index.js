import { ChangeMessageVisibilityCommand, DeleteMessageBatchCommand, DeleteMessageCommand, GetQueueUrlCommand, ReceiveMessageCommand, SQSClient, SQSClient as SQSClient$1, SendMessageBatchCommand, SendMessageCommand } from "@aws-sdk/client-sqs";
import { globalClient, mockObjectValues, nextTick } from "@awsless/utils";
import { seconds, toSeconds } from "@awsless/duration";
import { parse, stringify } from "@awsless/json";
import chunk from "chunk";
import { randomUUID } from "crypto";
import { mockClient } from "aws-sdk-vitest-mock";
//#region src/client.ts
const sqsClient = globalClient(() => {
	return new SQSClient$1({});
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
	const command = new GetQueueUrlCommand({ QueueName: queue });
	return (await client.send(command)).QueueUrl;
};
const cache = /* @__PURE__ */ new Map();
const getCachedQueueUrl = (queue, client = sqsClient()) => {
	if (!cache.has(queue)) cache.set(queue, getQueueUrl(queue, client));
	return cache.get(queue);
};
const sendMessage = async ({ client = sqsClient(), queue, payload, delay, groupId, deduplicationId, attributes = {} }) => {
	const url = await getCachedQueueUrl(queue, client);
	const command = new SendMessageCommand({
		QueueUrl: url,
		MessageBody: stringify(payload),
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
	await Promise.all(chunk(items, 10).map(async (batch) => {
		const command = new SendMessageBatchCommand({
			QueueUrl: url,
			Entries: batch.map(({ payload, delay, groupId, deduplicationId, attributes = {} }, id) => ({
				Id: String(id),
				MessageBody: stringify(payload),
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
const receiveMessages = async ({ client = sqsClient(), queue, maxMessages = 10, waitTime = seconds(20), visibilityTimeout, abortSignal }) => {
	const url = await getCachedQueueUrl(queue, client);
	const command = new ReceiveMessageCommand({
		QueueUrl: url,
		MaxNumberOfMessages: maxMessages,
		WaitTimeSeconds: toSeconds(waitTime),
		VisibilityTimeout: toSeconds(visibilityTimeout),
		MessageAttributeNames: ["All"]
	});
	return (await client.send(command, { abortSignal })).Messages ?? [];
};
const deleteMessage = async ({ client = sqsClient(), queue, receiptHandle }) => {
	const url = await getCachedQueueUrl(queue, client);
	const command = new DeleteMessageCommand({
		QueueUrl: url,
		ReceiptHandle: receiptHandle
	});
	await client.send(command);
};
const deleteMessageBatch = async ({ client = sqsClient(), queue, receiptHandles }) => {
	const url = await getCachedQueueUrl(queue, client);
	await Promise.all(chunk(receiptHandles, 10).map(async (batch) => {
		const command = new DeleteMessageBatchCommand({
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
	const command = new ChangeMessageVisibilityCommand({
		QueueUrl: url,
		ReceiptHandle: receiptHandle,
		VisibilityTimeout: toSeconds(visibilityTimeout)
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
					payload: parse(message.Body),
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
	const list = mockObjectValues(queues);
	const messageStore = new MessageStore();
	const get = (input) => {
		const name = input.QueueUrl;
		const callback = list[name];
		if (!callback) throw new TypeError(`SQS mock function not defined for: ${name}`);
		return callback;
	};
	const client = mockClient(SQSClient$1);
	client.on(GetQueueUrlCommand).callsFake(async (input) => ({ QueueUrl: input.QueueName }));
	client.on(SendMessageCommand).callsFake(async (input) => {
		const callback = get(input);
		const messageId = randomUUID();
		const receiptHandle = randomUUID();
		messageStore.addMessage(input.QueueUrl, {
			MessageId: messageId,
			ReceiptHandle: receiptHandle,
			Body: input.MessageBody,
			MessageAttributes: input.MessageAttributes
		});
		await nextTick(callback, { Records: [{
			body: input.MessageBody,
			messageId,
			messageAttributes: input.MessageAttributes
		}] });
		return { MessageId: messageId };
	});
	client.on(SendMessageBatchCommand).callsFake(async (input) => {
		const callback = get(input);
		const records = input.Entries?.map((entry) => {
			const messageId = entry.Id || randomUUID();
			const receiptHandle = randomUUID();
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
		await nextTick(callback, { Records: records });
		return {};
	});
	client.on(ReceiveMessageCommand).callsFake(async (input) => {
		const deadline = Date.now() + (input.WaitTimeSeconds || 1) * 1e3;
		while (Date.now() < deadline) {
			const messages = messageStore.receiveMessages(input.QueueUrl, input.MaxNumberOfMessages ?? 1, input.VisibilityTimeout);
			if (messages.length > 0) return { Messages: messages };
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
		return { Messages: [] };
	});
	client.on(DeleteMessageCommand).callsFake(async (input) => {
		messageStore.deleteMessage(input.QueueUrl, input.ReceiptHandle);
		return {};
	});
	client.on(DeleteMessageBatchCommand).callsFake(async (input) => {
		for (const entry of input.Entries ?? []) messageStore.deleteMessage(input.QueueUrl, entry.ReceiptHandle);
		return {};
	});
	client.on(ChangeMessageVisibilityCommand).callsFake(async (input) => {
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
export { SQSClient, changeMessageVisibility, deleteMessage, deleteMessageBatch, getCachedQueueUrl, getQueueUrl, mockSQS, receiveMessages, sendMessage, sendMessageBatch, sqsClient, subscribe };
