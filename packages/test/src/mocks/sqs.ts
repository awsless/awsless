
import { SQSClient, SendMessageCommand, GetQueueUrlCommand, SendMessageBatchCommand, MessageAttributeValue, SendMessageCommandInput, SendMessageBatchCommandInput, GetQueueUrlCommandInput } from '@aws-sdk/client-sqs'
import { asyncCall, mockObjectKeys } from '../helpers/mock'
import { randomUUID } from 'crypto'
import { mockClient } from 'aws-sdk-client-mock'

type Queues = {
	[key: string]: (payload:any) => any
}

const formatAttributes = (attributes: Record<string, MessageAttributeValue> | undefined) => {
	const list:Record<string, { dataType:string, stringValue:string }> = {}
	for(const key in attributes) {
		list[key] = {
			dataType: attributes[key].DataType as string,
			stringValue: attributes[key].StringValue as string
		}
	}

	return list
}

export const mockSQS = <T extends Queues>(queues:T) => {
	const list = mockObjectKeys(queues)

	const get = (input: SendMessageCommandInput | SendMessageBatchCommandInput) => {
		const name = input.QueueUrl || ''
		const callback = list[ name ]

		if(!callback) {
			throw new TypeError(`Sqs mock function not defined for: ${ name }`)
		}

		return callback
	}

	mockClient(SQSClient)
		.on(GetQueueUrlCommand)
		.callsFake((input:GetQueueUrlCommandInput) => ({ QueueUrl: input.QueueName }))

		.on(SendMessageCommand)
		.callsFake(async (input:SendMessageCommandInput) => {
			const callback = get(input)
			await asyncCall(callback, {
				Records: [{
					body: input.MessageBody,
					messageId: randomUUID(),
					messageAttributes: formatAttributes(input.MessageAttributes)
				}]
			})
		})

		.on(SendMessageBatchCommand)
		.callsFake(async (input:SendMessageBatchCommandInput) => {
			const callback = get(input)
			await asyncCall(callback, {
				Records: (input.Entries || []).map(entry => ({
					body: entry.MessageBody,
					messageId: entry.Id || randomUUID(),
					messageAttributes: formatAttributes(entry.MessageAttributes)
				}))
			})
		})

	beforeEach && beforeEach(() => {
		Object.values(list).forEach(fn => {
			fn.mockClear()
		})
	})

	return list
}
