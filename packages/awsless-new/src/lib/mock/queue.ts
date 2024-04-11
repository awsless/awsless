import { mockSQS } from '@awsless/sqs'
import { getQueueName } from '../resource/queue.js'
import { createProxy } from '../resource/util.js'

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

// const fns = mockQueue(mock => {
// 	mock.stack.func(() => {
// 		return 1
// 	})
// })

// // fns.stack.func

// const func = (input: number) => {
// 	return {
// 		input,
// 		str: '1',
// 	}
// }

// type Func = (...args: any[]) => any
// type MockHandle<F extends Func> = (payload: Parameters<F>[0]) => void
// type Mock<F extends Func> = (handle?: MockHandle<F>) => void

// export interface QueueMock {
// 	readonly stack: {
// 		readonly func: Mock<typeof func>
// 	}
// }
