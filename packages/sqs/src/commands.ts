import {
	ChangeMessageVisibilityCommand,
	DeleteMessageBatchCommand,
	DeleteMessageCommand,
	GetQueueUrlCommand,
	MessageAttributeValue,
	ReceiveMessageCommand,
	SQSClient,
	SendMessageBatchCommand,
	SendMessageCommand,
} from '@aws-sdk/client-sqs'
import { Duration, seconds, toSeconds } from '@awsless/duration'
import { parse, stringify } from '@awsless/json'
import chunk from 'chunk'
import { sqsClient } from './client'
import { Attributes, SendMessageBatchOptions, SendMessageOptions } from './types'

const encodeAttributes = (attributes: Attributes) => {
	const list: Record<string, MessageAttributeValue> = {}
	for (const key in attributes) {
		list[key] = {
			DataType: 'String',
			StringValue: attributes[key],
		}
	}

	return list
}

const decodeAttributes = (attributes?: Record<string, MessageAttributeValue>) => {
	const list: Attributes = {}
	for (const key in attributes) {
		list[key] = attributes[key]?.StringValue!
	}

	return list
}

export const getQueueUrl = async (client: SQSClient, queue: string) => {
	if (queue.includes('://')) {
		return queue
	}

	const command = new GetQueueUrlCommand({ QueueName: queue })
	const response = await client.send(command)

	return response.QueueUrl!
}

const cache = new Map<string, Promise<string>>()

export const getCachedQueueUrl = (client: SQSClient, queue: string) => {
	if (!cache.has(queue)) {
		cache.set(queue, getQueueUrl(client, queue))
	}

	return cache.get(queue)!
}

export const sendMessage = async ({
	client = sqsClient(),
	queue,
	payload,
	delay = 0,
	attributes = {},
}: SendMessageOptions) => {
	const url = await getCachedQueueUrl(client, queue)

	const command = new SendMessageCommand({
		QueueUrl: url,
		MessageBody: stringify(payload),
		DelaySeconds: delay,
		MessageAttributes: encodeAttributes({ queue, ...attributes }),
	})

	await client.send(command)
}

/** Add batch of messages to a SQS queue */
export const sendMessageBatch = async ({ client = sqsClient(), queue, items }: SendMessageBatchOptions) => {
	const url = await getCachedQueueUrl(client, queue)

	await Promise.all(
		chunk(items, 10).map(async batch => {
			const command = new SendMessageBatchCommand({
				QueueUrl: url,
				Entries: batch.map(({ payload, delay = 0, attributes = {} }, id) => ({
					Id: String(id),
					MessageBody: stringify(payload),
					DelaySeconds: delay,
					MessageAttributes: encodeAttributes({ queue, ...attributes }),
				})),
			})

			return client.send(command)
		})
	)
}

export const receiveMessages = async ({
	client = sqsClient(),
	queue,
	maxMessages = 10,
	waitTime = seconds(20),
	visibilityTimeout,
	abortSignal,
}: {
	client?: SQSClient
	queue: string
	maxMessages?: number
	waitTime?: Duration
	visibilityTimeout: Duration
	abortSignal?: AbortSignal
}) => {
	const url = await getCachedQueueUrl(client, queue)

	const command = new ReceiveMessageCommand({
		QueueUrl: url,
		MaxNumberOfMessages: maxMessages,
		WaitTimeSeconds: toSeconds(waitTime),
		VisibilityTimeout: toSeconds(visibilityTimeout),
		MessageAttributeNames: ['All'],
	})

	const response = await client.send(command, { abortSignal })
	return response.Messages ?? []
}

export const deleteMessage = async ({
	client = sqsClient(),
	queue,
	receiptHandle,
}: {
	client?: SQSClient
	queue: string
	receiptHandle: string
}) => {
	const url = await getCachedQueueUrl(client, queue)

	const command = new DeleteMessageCommand({
		QueueUrl: url,
		ReceiptHandle: receiptHandle,
	})

	await client.send(command)
}

export const deleteMessageBatch = async ({
	client = sqsClient(),
	queue,
	receiptHandles,
}: {
	client?: SQSClient
	queue: string
	receiptHandles: string[]
}) => {
	const url = await getCachedQueueUrl(client, queue)

	await Promise.all(
		chunk(receiptHandles, 10).map(async batch => {
			const command = new DeleteMessageBatchCommand({
				QueueUrl: url,
				Entries: batch.map((receiptHandle, index) => ({
					Id: String(index),
					ReceiptHandle: receiptHandle,
				})),
			})

			await client.send(command)
		})
	)
}

export const changeMessageVisibility = async ({
	client = sqsClient(),
	queue,
	receiptHandle,
	visibilityTimeout,
}: {
	client?: SQSClient
	queue: string
	receiptHandle: string
	visibilityTimeout: Duration
}) => {
	const url = await getCachedQueueUrl(client, queue)

	const command = new ChangeMessageVisibilityCommand({
		QueueUrl: url,
		ReceiptHandle: receiptHandle,
		VisibilityTimeout: toSeconds(visibilityTimeout),
	})

	await client.send(command)
}

export async function* subscribe({
	client = sqsClient(),
	queue,
	maxMessages = 10,
	waitTime,
	visibilityTimeout,
	signal,
}: {
	client?: SQSClient
	queue: string
	maxMessages?: number
	visibilityTimeout: Duration
	waitTime?: Duration
	signal?: AbortSignal
}) {
	while (!signal?.aborted) {
		let messages
		try {
			messages = await receiveMessages({
				client,
				queue,
				maxMessages,
				waitTime,
				visibilityTimeout,
				abortSignal: signal,
			})
		} catch (error) {
			if (signal?.aborted) return
			console.error(
				JSON.stringify({
					message: 'Error polling queue',
					error: error instanceof Error ? { ...error, name: error.name, message: error.message } : error,
				})
			)
			await new Promise(resolve => setTimeout(resolve, 5000))
			continue
		}

		const parsed: {
			record: {
				payload: unknown
				attributes: Record<string, string>
			}
			receiptHandle: string
		}[] = []

		for (const message of messages) {
			try {
				parsed.push({
					record: {
						payload: parse(message.Body!),
						attributes: decodeAttributes(message.MessageAttributes) as Record<string, string>,
					},
					receiptHandle: message.ReceiptHandle!,
				})
			} catch (error) {
				console.error(
					JSON.stringify({
						message: 'Error processing message body',
						error,
					})
				)
			}
		}

		if (parsed.length === 0) continue

		yield parsed.map(p => p.record)

		try {
			await deleteMessageBatch({
				client,
				queue,
				receiptHandles: parsed.map(p => p.receiptHandle),
			})
		} catch (error) {
			console.error(
				JSON.stringify({
					message: 'Error deleting messages',
					error,
				})
			)
		}
	}
}
