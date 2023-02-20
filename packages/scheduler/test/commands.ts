import { schedule, deleteSchedule, mockScheduler } from '../src'

describe('Scheduler', () => {
	const mock = mockScheduler({
		test: () => {},
	})

	it('should schedule a lambda', async () => {
		await schedule({
			lambda: 'test',
			idempotentKey: '123',
			payload: {},
			date: new Date(),
			roleArn: 'arn::role',
		})

		expect(mock.test).toBeCalledTimes(1)
	})

	it('should delete a schedule', async () => {
		await deleteSchedule({
			idempotentKey: '123',
		})
	})
})
