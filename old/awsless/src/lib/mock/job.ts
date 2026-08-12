import { mockEcs } from '@awsless/ecs'
import { createProxy } from '../proxy.js'
import { getJobName } from '../server/job.js'

export interface JobMock {}
export interface JobMockResponse {}

export const mockJob = (cb: (mock: JobMock) => void): JobMockResponse => {
	process.env.JOB_SUBNETS = JSON.stringify(['mock-subnet'])
	process.env.JOB_SECURITY_GROUP = 'mock-sg'

	const list: Record<string, (payload: any) => any> = {}
	const mock: JobMock = createProxy(stack => {
		return createProxy(name => {
			return (handle: (payload: any) => any = () => {}) => {
				list[getJobName(name, stack)] = handle
			}
		})
	})

	cb(mock)

	const mocks = mockEcs(list)

	return createProxy(stack => {
		return createProxy(name => {
			return mocks[getJobName(name, stack)]
		})
	})
}
