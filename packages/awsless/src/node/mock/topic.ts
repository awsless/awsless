import { createProxy } from '../util.js'
import { getTopicName } from '../topic.js'
import { mockSNS } from '@awsless/sns'

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

// const fns = mockTopic(mock => {
// 	mock.topic()
// })

// // fns.stack.func

// const func = (input: number) => {
// 	return {
// 		input,
// 		str: '1',
// 	}
// }

// type MockHandle = (payload: unknown) => void
// type Mock = (handle?: MockHandle) => void

// export interface TopicMock {
// 	readonly topic: Mock
// }
