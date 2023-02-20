import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'
import { mockSNS } from '../src'

describe('SNS Mock', () => {
	const sns = mockSNS({
		service__topic: () => {},
	})

	const client = new SNSClient({})

	it('should publish sns message', async () => {
		await client.send(
			new PublishCommand({
				TopicArn: `arn:aws:sns:eu-west-1:xxx:service__topic`,
				Message: '',
			})
		)

		expect(sns.service__topic).toBeCalledTimes(1)
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
