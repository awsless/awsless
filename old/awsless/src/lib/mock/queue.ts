import { mockSQS } from '@awsless/sqs'
import { createProxy } from '../proxy.js'
import { getQueueName } from '../server/queue.js'

export interface QueueMock {}
export interface QueueMockResponse {}

export const mockQueue = (cb: (mock: QueueMock) => void): QueueMockResponse => {
	const list: Record<string, any> = {}
	const mock: QueueMock = createProxy(stack => {
		return createProxy(name => {
			return (handle: unknown) => {
				list[getQueueName(name, stack)] = handle ?? (() => {})
			}
		})
	})

	cb(mock)

	const result = mockSQS(list)

	return createProxy(stack => {
		return createProxy(name => {
			return result[getQueueName(name, stack)]
		})
	})
}
