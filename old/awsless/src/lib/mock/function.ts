import { mockLambda } from '@awsless/lambda'
import { createProxy } from '../proxy.js'
import { getFunctionName } from '../server/function.js'
// import type { Mock } from 'vitest'

export interface FunctionMock {}
export interface FunctionMockResponse {}

export const mockFunction = (cb: (mock: FunctionMock) => void): FunctionMockResponse => {
	const list: Record<string, any> = {}
	const mock: FunctionMock = createProxy(stack => {
		return createProxy(name => {
			return (handleOrResponse: unknown) => {
				const handle = typeof handleOrResponse === 'function' ? handleOrResponse : () => handleOrResponse
				list[getFunctionName(name, stack)] = handle
			}
		})
	})

	cb(mock)

	const result = mockLambda(list)

	return createProxy(stack => {
		return createProxy(name => {
			return result[getFunctionName(name, stack)]
		})
	})
}
