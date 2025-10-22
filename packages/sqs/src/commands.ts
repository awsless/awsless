import {
	DeleteMessageCommand,
	GetQueueUrlCommand,
	MessageAttributeValue,
	ReceiveMessageCommand,
	SQSClient,
	SendMessageBatchCommand,
	SendMessageCommand,
} from '@aws-sdk/client-sqs'
import chunk from 'chunk'
import { sqsClient } from './client'
import { Attributes, SendMessageBatchOptions, SendMessageOptions } from './types'

const formatAttributes = (attributes: Attributes) => {
	const list: Record<string, MessageAttributeValue> = {}
	for (let key in attributes) {
		list[key] = {
			DataType: 'String',
			StringValue: attributes[key],
		}
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
		MessageBody: JSON.stringify(payload),
		DelaySeconds: delay,
		MessageAttributes: formatAttributes({ queue, ...attributes }),
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
					MessageBody: JSON.stringify(payload),
					DelaySeconds: delay,
					MessageAttributes: formatAttributes({ queue, ...attributes }),
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
	waitTimeSeconds = 20,
	visibilityTimeout = 30,
}: {
	client?: SQSClient
	queue: string
	maxMessages?: number
	waitTimeSeconds?: number
	visibilityTimeout?: number
}) => {
	const url = await getCachedQueueUrl(client, queue)

	const command = new ReceiveMessageCommand({
		QueueUrl: url,
		MaxNumberOfMessages: maxMessages,
		WaitTimeSeconds: waitTimeSeconds,
		VisibilityTimeout: visibilityTimeout,
		MessageAttributeNames: ['All'],
	})

	const response = await client.send(command)
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
