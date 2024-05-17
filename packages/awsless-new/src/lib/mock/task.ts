import { mockLambda } from '@awsless/lambda'
import { createProxy } from '../resource/util.js'
import { getTaskName } from '../resource/task.js'
// import type { Mock } from 'vitest'

export interface TaskMock {}
export interface TaskMockResponse {}

export const mockTask = (cb: (mock: TaskMock) => void): TaskMockResponse => {
	const list: Record<string, any> = {}
	const mock: TaskMock = createProxy(stack => {
		return createProxy(name => {
			return (handle: unknown) => {
				list[getTaskName(stack, name)] = handle
			}
		})
	})

	cb(mock)

	const result = mockLambda(list)

	return createProxy(stack => {
		return createProxy(name => {
			return result[getTaskName(stack, name)]
		})
	})
}
