import type { Mock } from 'vitest'
import { createProxy } from '../proxy.js'
import { getJobName } from '../server/job.js'

export interface JobMock {}
export interface JobMockResponse {}

export const mockJob = (cb: (mock: JobMock) => void): JobMockResponse => {
	const list: Record<string, Mock<(payload: any) => any>> = {}
	const mock: JobMock = createProxy(stack => {
		return createProxy(name => {
			return (handle: (payload: any) => any) => {
				list[getJobName(name, stack)] = vi.fn(handle)
			}
		})
	})

	cb(mock)

	beforeEach &&
		beforeEach(() => {
			for (const item of Object.values(list)) {
				item.mockClear()
			}
		})

	return createProxy(stack => {
		return createProxy(name => {
			return list[getJobName(name, stack)]
		})
	})
}
