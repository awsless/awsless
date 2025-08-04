import { CreateScheduleCommand, SchedulerClient } from '@aws-sdk/client-scheduler'
import { mockScheduler } from '../src'

describe('Scheduler Mock', () => {
	const scheduler = mockScheduler({
		lambda__name: () => {},
	})

	const client = new SchedulerClient({})

	it('should create a new schedule', async () => {
		await client.send(
			new CreateScheduleCommand({
				Name: 'test',
				ScheduleExpression: `at(${new Date().toISOString()})`,
				FlexibleTimeWindow: { Mode: 'OFF' },
				Target: {
					Arn: `arn:aws:lambda:eu-west-1:xxx:lambda__name`,
					Input: JSON.stringify('hello world'),
					RoleArn: 'arn:aws:iam',
				},
			})
		)

		expect(scheduler.lambda__name).toBeCalledTimes(1)
	})

	it('should throw for unknown lambda', async () => {
		const promise = client.send(
			new CreateScheduleCommand({
				Name: 'test',
				ScheduleExpression: `at(${new Date().toISOString()})`,
				FlexibleTimeWindow: { Mode: 'OFF' },
				Target: {
					Arn: `arn:aws:lambda:eu-west-1:xxx:unknown`,
					RoleArn: 'arn:aws:iam',
				},
			})
		)

		await expect(promise).rejects.toThrow(TypeError)
	})
})
