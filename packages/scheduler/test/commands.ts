import { minutes } from '@awsless/duration'
import { mockScheduler, scheduleInvoke } from '../src'

describe('Scheduler', () => {
	const mock = mockScheduler({
		test: () => {},
	})

	it('should schedule a lambda function', async () => {
		await scheduleInvoke({
			name: 'test',
			schedule: minutes(5),
			roleArn: 'arn::role',
		})

		expect(mock.test).toBeCalledTimes(1)
	})
})
