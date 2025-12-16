import { mockLambda } from '@awsless/lambda'
import { createProxy } from '../util.js'
import { getFunctionName } from '../function.js'
// import type { Mock } from 'vitest'

export interface FunctionMock {}
export interface FunctionMockResponse {}

export const mockFunction = (cb: (mock: FunctionMock) => void): FunctionMockResponse => {
	const list: Record<string, any> = {}
	const mock: FunctionMock = createProxy(stack => {
		return createProxy(name => {
			return (handleOrResponse: unknown) => {
				const handle = typeof handleOrResponse === 'function' ? handleOrResponse : () => handleOrResponse
				list[getFunctionName(stack, name)] = handle
			}
		})
	})

	cb(mock)

	const result = mockLambda(list)

	return createProxy(stack => {
		return createProxy(name => {
			return result[getFunctionName(stack, name)]
		})
	})
}

// const fns = mockFunction(mock => {
// 	mock.stack.func({ str: '1' })

// 	// mock.stack.name()
// 	// mock.stack.name('foo')
// })

// const func = (input: number) => {
// 	return {
// 		input,
// 		str: '1',
// 	}
// }

// type Func = (...args: any[]) => any
// type Response<F extends Func> = Partial<Awaited<InvokeResponse<F>>>
// type MockHandle<F extends Func> = (payload: Parameters<F>[0]) => Response<F> | void
// type MockHandleOrResponse<F extends Func> = MockHandle<F> | Response<F>

// type MockBuilder<F extends Func> = {
// 	(handleOrResponse?: MockHandleOrResponse<F>): void
// }

// export interface FunctionMock {
// 	readonly stack: {
// 		readonly func: MockBuilder<typeof func>
// 	}
// }

// export interface FunctionMockResponse {
// 	readonly stack: {
// 		readonly func: Mock
// 	}
// }
