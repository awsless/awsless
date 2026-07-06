import { mockSQS } from '@awsless/sqs'
import { createProxy } from '../proxy.js'
import { getInstanceQueueName } from '../server/instance.js'

export interface InstanceMock {}
export interface InstanceMockResponse {}

export const mockInstance = (cb: (mock: InstanceMock) => void): InstanceMockResponse => {
	const list: Record<string, any> = {}
	const mock: InstanceMock = createProxy(stack => {
		return createProxy(name => {
			return (handle: unknown) => {
				list[getInstanceQueueName(name, stack)] = handle ?? (() => {})
			}
		})
	})

	cb(mock)

	const result = mockSQS(list)

	return createProxy(stack => {
		return createProxy(name => {
			return result[getInstanceQueueName(name, stack)]
		})
	})
}
