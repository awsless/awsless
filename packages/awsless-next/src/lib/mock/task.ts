import { mockLambda } from '@awsless/lambda'
import { mockScheduler } from '@awsless/scheduler'
import { createProxy } from '../proxy.js'
import { getTaskName } from '../server/task.js'
// import type { Mock } from 'vitest'

export interface TaskMock {}
export interface TaskMockResponse {}

export const mockTask = (cb: (mock: TaskMock) => void): TaskMockResponse => {
	const list: Record<string, (payload: any) => any> = {}
	const mock: TaskMock = createProxy(stack => {
		return createProxy(name => {
			return (handle: (payload: any) => any) => {
				list[getTaskName(name, stack)] = vi.fn(handle)
			}
		})
	})

	cb(mock)

	mockLambda(list)
	mockScheduler(list)

	return createProxy(stack => {
		return createProxy(name => {
			return list[getTaskName(name, stack)]
			// return result[getTaskName(name, stack)]
		})
	})
}
