import { mockLambda } from '@awsless/lambda'
import { mockScheduler } from '@awsless/scheduler'
import type { Mock } from 'vitest'
import { createProxy } from '../proxy.js'
import { BUNDLE_NAME, ROUTE_PROPERTY } from '../server/bundle.js'
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

	// A scheduled task targets the shared bundle, so the scheduler mock unwraps
	// the route payload & hands it to the task its route key names.
	mockScheduler({
		...list,
		[BUNDLE_NAME]: vi.fn(async (payload: { [ROUTE_PROPERTY]: string; event: unknown }) => {
			const [stack, , name] = payload[ROUTE_PROPERTY].split(':')

			return list[getTaskName(name!, stack!)]?.(payload.event)
		}),
	})

	beforeEach &&
		beforeEach(() => {
			for (const item of Object.values(list)) {
				item.mockClear()
			}
		})

	return createProxy(stack => {
		return createProxy(name => {
			return list[getTaskName(name, stack)]
		})
	})
}
