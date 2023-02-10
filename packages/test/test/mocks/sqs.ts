import { SQSClient, SendMessageCommand, GetQueueUrlCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs'
import { describe, it, expect } from 'vitest'
import { mockSQS } from '../../src'

describe('SQS Mock', () => {

	const sqs = mockSQS({
		service__echo: () => {}
	})

	const client = new SQSClient({})

	it('should get queue url', async () => {
		const result = await client.send(new GetQueueUrlCommand({
			QueueName: 'service__echo'
		}))

		expect(result).toStrictEqual({
			QueueUrl: 'service__echo'
		})

		expect(sqs.service__echo).toBeCalledTimes(0)
	})

	it('should send message', async () => {
		await client.send(new SendMessageCommand({
			QueueUrl: 'service__echo',
			MessageBody: ''
		}))

		expect(sqs.service__echo).toBeCalledTimes(1)
	})

	it('should only send message async', async () => {
		const promise = client.send(new SendMessageCommand({
			QueueUrl: 'service__echo',
			MessageBody: ''
		}))

		expect(sqs.service__echo).not.toBeCalled()

		await promise
	})

	it('should batch send messages', async () => {
		await client.send(new SendMessageBatchCommand({
			QueueUrl: 'service__echo',
			Entries: [
				{
					Id: '1',
					MessageBody: ''
				},
				{
					Id: '2',
					MessageBody: ''
				}
			]
		}))

		expect(sqs.service__echo).toBeCalledTimes(1)
	})

	it('should throw for unknown queue', async () => {
		const promise = client.send(new SendMessageCommand({
			QueueUrl: 'unknown',
			MessageBody: ''
		}))

		await expect(promise).rejects.toThrow(TypeError)
		expect(sqs.service__echo).toBeCalledTimes(0)
	})
})
