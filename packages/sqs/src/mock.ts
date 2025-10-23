import {
	ChangeMessageVisibilityCommand,
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
	private queues: Record<string, Message[]> = {}

	addMessage(queueUrl: string, message: Message) {
		if (!this.queues[queueUrl]) {
			this.queues[queueUrl] = []
		}
		this.queues[queueUrl]!.push(message)
	}

	receiveMessages(queueUrl: string, maxMessages: number): Message[] {
		const messages = this.queues[queueUrl] || []
		return messages.slice(0, maxMessages)
	}

	deleteMessage(queueUrl: string, receiptHandle: string) {
		if (this.queues[queueUrl]) {
			this.queues[queueUrl] = this.queues[queueUrl]!.filter(msg => msg.ReceiptHandle !== receiptHandle)
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
			const messages = messageStore.receiveMessages(input.QueueUrl!, input.MaxNumberOfMessages ?? 1)

			return {
				Messages: messages,
			}
		})

		.on(DeleteMessageCommand)
		.callsFake(async (input: DeleteMessageCommandInput) => {
			messageStore.deleteMessage(input.QueueUrl!, input.ReceiptHandle!)
			return {}
		})

		.on(ChangeMessageVisibilityCommand)
		.callsFake(async () => {
			// Mock doesn't need to do anything - just acknowledge the call
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
