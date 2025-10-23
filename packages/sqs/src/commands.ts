import {
	ChangeMessageVisibilityCommand,
	DeleteMessageCommand,
	GetQueueUrlCommand,
	Message,
	MessageAttributeValue,
	ReceiveMessageCommand,
	SQSClient,
	SendMessageBatchCommand,
	SendMessageCommand,
} from '@aws-sdk/client-sqs'
import { Duration, seconds, toMilliSeconds } from '@awsless/duration'
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

export const changeMessageVisibility = async ({
	client = sqsClient(),
	queue,
	receiptHandle,
	visibilityTimeout,
}: {
	client?: SQSClient
	queue: string
	receiptHandle: string
	visibilityTimeout: number
}) => {
	const url = await getCachedQueueUrl(client, queue)

	const command = new ChangeMessageVisibilityCommand({
		QueueUrl: url,
		ReceiptHandle: receiptHandle,
		VisibilityTimeout: visibilityTimeout,
	})

	await client.send(command)
}

export const listen = ({
	client = sqsClient(),
	queue,
	maxMessages,
	waitTimeSeconds,
	visibilityTimeout,
	autoExtendVisibility,
	handleMessage,
}: {
	client?: SQSClient
	queue: string
	maxMessages: number
	waitTimeSeconds: number
	visibilityTimeout: number
	autoExtendVisibility?: boolean
	handleMessage: (message: Message, options: { signal: AbortSignal }) => Promise<unknown> | void
}) => {
	let isListening = true
	let inFlightMessages = 0
	const abortController = new AbortController()
	const signal = abortController.signal

	const extensionInterval = autoExtendVisibility ? (visibilityTimeout * 1000) / 2 : undefined

	const startVisibilityExtension = (receiptHandle: string) => {
		const interval = setInterval(async () => {
			if (!isListening || signal.aborted) {
				clearInterval(interval)
				return
			}
			await changeMessageVisibility({
				client,
				queue,
				receiptHandle,
				visibilityTimeout,
			})
		}, extensionInterval!)

		return () => clearInterval(interval)
	}

	;(async () => {
		while (isListening && !signal.aborted) {
			try {
				const messages = await receiveMessages({
					client,
					queue,
					maxMessages,
					waitTimeSeconds,
					visibilityTimeout,
				})

				if (messages.length > 0) {
					inFlightMessages += messages.length

					await Promise.all(
						messages.map(async message => {
							let stopExtension

							try {
								if (extensionInterval) {
									stopExtension = startVisibilityExtension(message.ReceiptHandle!)
								}

								await handleMessage(message, { signal })

								// Only delete if not aborted
								if (!signal.aborted) {
									await deleteMessage({
										client,
										queue,
										receiptHandle: message.ReceiptHandle!,
									})
								}
							} catch (error) {
								if (!signal.aborted) {
									console.error('Error processing message:', error)
								}
							} finally {
								stopExtension?.()
								inFlightMessages--
							}
						})
					)
				} else {
					await new Promise(resolve => setImmediate(resolve))
				}
			} catch (error) {
				if (isListening && !signal.aborted) {
					console.error('Error polling queue:', error)
				}
			}
		}
	})()

	return async (maxWaitTime: Duration = seconds(10)) => {
		isListening = false
		abortController.abort()

		const deadline = Date.now() + toMilliSeconds(maxWaitTime)

		while (inFlightMessages > 0 && Date.now() < deadline) {
			await new Promise(resolve => setTimeout(resolve, 100))
		}
	}
}
