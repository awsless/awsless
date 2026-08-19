import { randomUUID } from 'crypto'
import { PublishCommand, PublishCommandInput, SNSClient } from '@aws-sdk/client-sns'
import { mockObjectValues, nextTick } from '@awsless/utils'
import { mockClient } from 'aws-sdk-client-mock'
import type { Mock } from 'vitest'

type Topics = {
	[key: string]: (payload: any) => any
}

const globalList: Record<string, Mock> = {}

export const mockSNS = <T extends Topics>(topics: T) => {
	const alreadyMocked = Object.keys(globalList).length > 0
	const list = mockObjectValues(topics)

	Object.assign(globalList, list)

	if (alreadyMocked) {
		return list
	}

	mockClient(SNSClient)
		.on(PublishCommand)
		.callsFake(async (input: PublishCommandInput) => {
			const parts = input.TopicArn?.split(':') ?? ''
			const topic = parts[parts.length - 1] ?? ''
			const callback = globalList[topic]

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
