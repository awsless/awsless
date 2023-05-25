import { PublishCommand, PublishCommandInput, SNSClient } from '@aws-sdk/client-sns'
import { mockObjectValues, nextTick } from '@awsless/utils'
import { randomUUID } from 'crypto'
import { mockClient } from 'aws-sdk-client-mock'
// @ts-ignore
import { Mock } from 'vitest'

type Topics = {
	[key: string]: (payload: any) => any
}

export const mockSNS = <T extends Topics>(topics: T) => {
	const list = mockObjectValues(topics)

	mockClient(SNSClient)
		.on(PublishCommand)
		.callsFake(async (input: PublishCommandInput) => {
			const parts = input.TopicArn?.split(':') || ''
			const topic = parts[parts.length - 1]
			const callback = list[topic]

			if (!callback) {
				throw new TypeError(`Sns mock function not defined for: ${topic}`)
			}

			await nextTick(callback, {
				Records: [
					{
						Sns: {
							TopicArn: input.TopicArn,
							MessageId: randomUUID(),
							Timestamp: new Date().toISOString(),
							Message: input.Message,
						},
					},
				],
			})
		})

	beforeEach(() => {
		Object.values(list).forEach(fn => {
			fn.mockClear()
		})
	})

	return list
}
