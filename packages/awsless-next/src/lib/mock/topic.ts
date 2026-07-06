import { mockSNS } from '@awsless/sns'
import { createProxy } from '../proxy.js'
import { getTopicName } from '../server/topic.js'

export interface TopicMock {}
export interface TopicMockResponse {}

export const mockTopic = (cb: (mock: TopicMock) => void): TopicMockResponse => {
	const list: Record<string, any> = {}
	const mock: TopicMock = createProxy(name => {
		return (handle: unknown) => {
			list[getTopicName(name)] = handle ?? (() => {})
		}
	})

	cb(mock)

	const result = mockSNS(list)

	return createProxy(name => {
		return result[getTopicName(name)]
	})
}
