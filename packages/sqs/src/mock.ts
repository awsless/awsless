import {
	ChangeMessageVisibilityCommand,
	ChangeMessageVisibilityCommandInput,
	DeleteMessageCommand,
	DeleteMessageCommandInput,
	GetQueueUrlCommand,
	Message,
	MessageAttributeValue,
	ReceiveMessageCommand,
	ReceiveMessageCommandInput,
	SQSClient,
	SendMessageBatchCommand,
	SendMessageBatchCommandInput,
	SendMessageCommand,
	SendMessageCommandInput,
} from '@aws-sdk/client-sqs'
import { mockObjectValues, nextTick } from '@awsless/utils'
import { mockClient } from 'aws-sdk-client-mock'
import { randomUUID } from 'crypto'
// @ts-ignore
import { Mock } from 'vitest'

type Queues = {
	[key: string]: (payload: unknown) => unknown
}

const formatAttributes = (attributes: Record<string, MessageAttributeValue> | undefined) => {
	const list: Record<string, { dataType: string; stringValue: string }> = {}

	for (const [key, attr] of Object.entries(attributes ?? {})) {
		list[key] = {
			dataType: attr.DataType!,
			stringValue: attr.StringValue!,
		}
	}

	return list
}

class MessageStore {
	private queues: Record<string, { message: Message; invisible?: number }[]> = {}

	addMessage(queueUrl: string, message: Message) {
		if (!this.queues[queueUrl]) {
			this.queues[queueUrl] = []
		}
		this.queues[queueUrl].push({ message })
	}

	receiveMessages(queueUrl: string, maxMessages: number, timeout = 1): Message[] {
		const messages = this.queues[queueUrl] ?? []
		return messages
			.filter(entry => !entry.invisible || Date.now() > entry.invisible)
			.slice(0, maxMessages)
			.map(entry => {
				entry.invisible = Date.now() + timeout * 1000
				return entry.message
			})
	}

	deleteMessage(queueUrl: string, receiptHandle: string) {
		if (this.queues[queueUrl]) {
			this.queues[queueUrl] = this.queues[queueUrl]!.filter(
				entry => entry.message.ReceiptHandle !== receiptHandle
			)
		}
	}

	changeVisibility(queueUrl: string, receiptHandle: string, timeout: number) {
		const messages = this.queues[queueUrl] ?? []
		for (const entry of messages) {
			if (entry.message.ReceiptHandle === receiptHandle) {
				entry.invisible = Date.now() + timeout * 1000
			}
		}
	}

	clear() {
		this.queues = {}
	}
}

export const mockSQS = <T extends Queues>(queues: T) => {
	const list = mockObjectValues(queues)
	const messageStore = new MessageStore()

	const get = (input: SendMessageCommandInput | SendMessageBatchCommandInput) => {
		const name = input.QueueUrl!
		const callback = list[name]

		if (!callback) {
			throw new TypeError(`SQS mock function not defined for: ${name}`)
		}

		return callback
	}

	const client = mockClient(SQSClient)

	client
		.on(GetQueueUrlCommand)
		.callsFake(input => ({ QueueUrl: input.QueueName }))

		.on(SendMessageCommand)
		.callsFake(async (input: SendMessageCommandInput) => {
			const callback = get(input)
			const messageId = randomUUID()
			const receiptHandle = randomUUID()

			// Add message to store for potential receiveMessage calls
			messageStore.addMessage(input.QueueUrl!, {
				MessageId: messageId,
				ReceiptHandle: receiptHandle,
				Body: input.MessageBody,
				MessageAttributes: input.MessageAttributes,
			})

			await nextTick(callback, {
				Records: [
					{
						body: input.MessageBody,
						messageId,
						messageAttributes: input.MessageAttributes,
					},
				],
			})

			return {
				MessageId: messageId,
			}
		})

		.on(SendMessageBatchCommand)
		.callsFake(async (input: SendMessageBatchCommandInput) => {
			const callback = get(input)
			const records = input.Entries?.map(entry => {
				const messageId = entry.Id || randomUUID()
				const receiptHandle = randomUUID()

				// Add message to store for potential receiveMessage calls
				messageStore.addMessage(input.QueueUrl!, {
					MessageId: messageId,
					ReceiptHandle: receiptHandle,
					Body: entry.MessageBody,
					MessageAttributes: entry.MessageAttributes,
				})

				return {
					body: entry.MessageBody,
					messageId,
					messageAttributes: formatAttributes(entry.MessageAttributes),
				}
			})

			await nextTick(callback, {
				Records: records,
			})
		})

		.on(ReceiveMessageCommand)
		.callsFake(async (input: ReceiveMessageCommandInput) => {
			const deadline = Date.now() + (input.WaitTimeSeconds || 1) * 1000
			while (Date.now() < deadline) {
				const messages = messageStore.receiveMessages(
					input.QueueUrl!,
					input.MaxNumberOfMessages ?? 1,
					input.VisibilityTimeout
				)

				if (messages.length > 0) {
					return {
						Messages: messages,
					}
				}

				await new Promise(resolve => setTimeout(resolve, 10))
			}

			return {
				Messages: [],
			}
		})

		.on(DeleteMessageCommand)
		.callsFake(async (input: DeleteMessageCommandInput) => {
			messageStore.deleteMessage(input.QueueUrl!, input.ReceiptHandle!)
			return {}
		})

		.on(ChangeMessageVisibilityCommand)
		.callsFake(async (input: ChangeMessageVisibilityCommandInput) => {
			messageStore.changeVisibility(input.QueueUrl!, input.ReceiptHandle!, input.VisibilityTimeout!)
			return {}
		})

	beforeEach(() => {
		Object.values(list).forEach(fn => {
			fn.mockClear()
		})
	})

	beforeAll(() => {
		messageStore.clear()
	})

	return list
}
