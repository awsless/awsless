import { minutes } from '@awsless/duration'
import { mockScheduler, schedule } from '../src'

describe('Scheduler', () => {
	const mock = mockScheduler({
		test: () => {},
	})

	it('should schedule a lambda function', async () => {
		await schedule({
			name: 'test',
			schedule: minutes(5),
			roleArn: 'arn::role',
		})

		expect(mock.test).toBeCalledTimes(1)
	})
})
