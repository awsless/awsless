import {
	SQSClient,
	SendMessageCommand,
	GetQueueUrlCommand,
	SendMessageBatchCommand,
} from '@aws-sdk/client-sqs'
import { SendMessage, SendMessageBatch, Attributes, FormattedAttributes } from './types'
import { sqsClient } from './client'
import chunk from 'chunk'

const formatAttributes = (attributes: Attributes) => {
	const list: FormattedAttributes = {}
	for (let key in attributes) {
		list[key] = {
			DataType: 'String',
			StringValue: attributes[key],
		}
	}

	return list
}

export const getQueueUrl = async (client: SQSClient, queue: string) => {
	const command = new GetQueueUrlCommand({ QueueName: queue })
	const response = await client.send(command)

	return response.QueueUrl
}

const cache = new Map()

export const getCachedQueueUrl = (client: SQSClient, queue: string) => {
	if (!cache.has(queue)) {
		cache.set(queue, getQueueUrl(client, queue))
	}

	return cache.get(queue)
}

export const sendMessage = async ({
	client = sqsClient.get(),
	queue,
	payload,
	delay = 0,
	attributes = {},
}: SendMessage) => {
	const url = await getCachedQueueUrl(client, queue)

	const command = new SendMessageCommand({
		QueueUrl: url,
		MessageBody: JSON.stringify(payload),
		DelaySeconds: delay,
		MessageAttributes: formatAttributes({ queue, ...attributes }),
	})

	return client.send(command)
}

/** Add batch of messages to a SQS queue */
export const sendMessageBatch = async ({ client = sqsClient.get(), queue, items }: SendMessageBatch) => {
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
