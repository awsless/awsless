import { mockLambda } from '@awsless/lambda'
import { mockScheduler } from '@awsless/scheduler'
import type { Mock } from 'vitest'
import { createProxy } from '../proxy.js'
import { getTaskName } from '../server/task.js'

export interface TaskMock {}
export interface TaskMockResponse {}

export const mockTask = (cb: (mock: TaskMock) => void): TaskMockResponse => {
	const list: Record<string, Mock<(payload: any) => any>> = {}
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

	beforeEach &&
		beforeEach(() => {
			for (const item of Object.values(list)) {
				item.mockClear()
			}
		})

	return createProxy(stack => {
		return createProxy(name => {
			return list[getTaskName(name, stack)]
			// return result[getTaskName(name, stack)]
		})
	})
}
