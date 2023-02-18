
import { describe, it } from 'vitest'
import { schedule } from '../../src/services/scheduler'
import { mockScheduler } from '@heat/aws-test'

describe('Scheduler', () => {

	const mock = mockScheduler({
		lambda__name: () => {}
	})

	it('should schedule a lambda', async () => {
		await schedule({
			name: 'lambda__name',
			idempotentKey: 'test',
			payload: {},
			date: new Date,
			roleArn: 'arn:test',
		})

		expect(mock.lambda__name).toBeCalledTimes(1)
	})
})
