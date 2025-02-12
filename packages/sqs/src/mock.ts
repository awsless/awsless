import {
	GetQueueUrlCommand,
	MessageAttributeValue,
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

export const mockSQS = <T extends Queues>(queues: T) => {
	const list = mockObjectValues(queues)

	const get = (input: SendMessageCommandInput | SendMessageBatchCommandInput) => {
		const name = input.QueueUrl!
		const callback = list[name]

		if (!callback) {
			throw new TypeError(`SQS mock function not defined for: ${name}`)
		}

		return callback
	}

	mockClient(SQSClient)
		.on(GetQueueUrlCommand)
		.callsFake(input => ({ QueueUrl: input.QueueName }))

		.on(SendMessageCommand)
		.callsFake(async (input: SendMessageCommandInput) => {
			const callback = get(input)

			await nextTick(callback, {
				Records: [
					{
						body: input.MessageBody,
						messageId: randomUUID(),
						messageAttributes: input.MessageAttributes,
					},
				],
			})
		})

		.on(SendMessageBatchCommand)
		.callsFake(async (input: SendMessageBatchCommandInput) => {
			const callback = get(input)
			await nextTick(callback, {
				Records: input.Entries?.map(entry => ({
					body: entry.MessageBody,
					messageId: entry.Id || randomUUID(),
					messageAttributes: formatAttributes(entry.MessageAttributes),
				})),
			})
		})

	beforeEach(() => {
		Object.values(list).forEach(fn => {
			fn.mockClear()
		})
	})

	return list
}
