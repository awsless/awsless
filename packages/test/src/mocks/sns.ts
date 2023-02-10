
import { PublishCommand, PublishCommandInput, SNSClient } from '@aws-sdk/client-sns'
import { asyncCall, mockObjectKeys } from '../helpers/mock'
import { randomUUID } from 'crypto'
import { mockClient } from 'aws-sdk-client-mock'

type Topics = {
	[key: string]: (payload:unknown) => unknown
}

export const mockSNS = <T extends Topics>(topics:T) => {
	const list = mockObjectKeys(topics)

	mockClient(SNSClient)
		.on(PublishCommand)
		.callsFake(async (input: PublishCommandInput) => {
			const parts = (input.TopicArn || '').split(':')
			const topic = parts[ parts.length - 1 ]
			const callback = list[ topic ]

			if(!callback) {
				throw new TypeError(`Sns mock function not defined for: ${ topic }`)
			}

			await asyncCall(callback, {
				Records: [{
					Sns: {
						TopicArn: input.TopicArn,
						MessageId: randomUUID(),
						Timestamp: Date.now(),
						Message: input.Message
					}
				}]
			})
		})

	beforeEach && beforeEach(() => {
		Object.values(list).forEach(fn => {
			fn.mockClear()
		})
	})

	return list
}
