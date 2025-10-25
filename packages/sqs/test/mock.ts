import {
	DeleteMessageCommand,
	GetQueueUrlCommand,
	ReceiveMessageCommand,
	SendMessageBatchCommand,
	SendMessageCommand,
} from '@aws-sdk/client-sqs'
import { mockSQS, sqsClient } from '../src'

describe('Mock', () => {
	const sqs = mockSQS({
		service__echo: () => {},
	})

	const client = sqsClient()

	it('should get queue url', async () => {
		const result = await client.send(
			new GetQueueUrlCommand({
				QueueName: 'service__echo',
			})
		)

		expect(result).toStrictEqual({
			QueueUrl: 'service__echo',
		})

		expect(sqs.service__echo).toBeCalledTimes(0)
	})

	it('should send message', async () => {
		await client.send(
			new SendMessageCommand({
				QueueUrl: 'service__echo',
				MessageBody: 'message body',
			})
		)

		expect(sqs.service__echo).toBeCalledTimes(1)
	})

	it('should batch send messages', async () => {
		await client.send(
			new SendMessageBatchCommand({
				QueueUrl: 'service__echo',
				Entries: [
					{
						Id: '1',
						MessageBody: '',
					},
					{
						Id: '2',
						MessageBody: '',
					},
				],
			})
		)

		expect(sqs.service__echo).toBeCalledTimes(1)
	})

	it('should throw for unknown queue', async () => {
		const promise = client.send(
			new SendMessageCommand({
				QueueUrl: 'unknown',
				MessageBody: '',
			})
		)

		await expect(promise).rejects.toThrow(TypeError)
		expect(sqs.service__echo).toBeCalledTimes(0)
	})

	it('should receive + delete messages', async () => {
		const result = await client.send(
			new ReceiveMessageCommand({
				QueueUrl: 'service__echo',
				MaxNumberOfMessages: 10,
				VisibilityTimeout: 1,
				WaitTimeSeconds: 1,
			})
		)

		expect(result.Messages).toHaveLength(3)

		await client.send(
			new DeleteMessageCommand({
				QueueUrl: 'service__echo',
				ReceiptHandle: result.Messages?.[0]?.ReceiptHandle!,
			})
		)

		await new Promise(resolve => setTimeout(resolve, 250))

		const result2 = await client.send(
			new ReceiveMessageCommand({
				QueueUrl: 'service__echo',
				MaxNumberOfMessages: 10,
				VisibilityTimeout: 1,
				WaitTimeSeconds: 1,
			})
		)

		expect(result2.Messages).toHaveLength(2)
	})
})
