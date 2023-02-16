import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'
import { publish, mockSNS } from '../src'

describe('SNS', () => {
	const mock = mockSNS({
		test: () => {},
	})

	const client = new SNSClient({})

	it('should send a notification', async () => {
		await publish({
			topic: 'test',
		})

		expect(mock.test).toBeCalledTimes(1)
	})

	it('should publish sns message', async () => {
		await client.send(
			new PublishCommand({
				TopicArn: `arn:aws:sns:eu-west-1:xxx:test`,
				Message: '',
			})
		)

		expect(mock.test).toBeCalledTimes(1)
	})

	it('should throw for unknown topic', async () => {
		const promise = client.send(
			new PublishCommand({
				TopicArn: `arn:aws:sns:eu-west-1:xxx:unknown`,
				Message: '',
			})
		)

		await expect(promise).rejects.toThrow(TypeError)
	})
})
