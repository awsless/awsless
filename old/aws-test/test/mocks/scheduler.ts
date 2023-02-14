
import { SchedulerClient, CreateScheduleCommand, DeleteScheduleCommand } from '@aws-sdk/client-scheduler'
import { describe, it, expect } from 'vitest'
import { mockScheduler } from '../../src'

describe('Scheduler Mock', () => {

	const scheduler = mockScheduler({
		lambda__name: () => {}
	})

	const client = new SchedulerClient({})

	it('should create a new schedule', async () => {
		await client.send(new CreateScheduleCommand({
			Name: 'test',
			ScheduleExpression: `at(${(new Date()).toISOString()})`,
			FlexibleTimeWindow: { Mode: 'OFF' },
			Target: {
				Arn: `arn:aws:lambda:eu-west-1:xxx:lambda__name`,
				Input: JSON.stringify('hello world'),
				RoleArn: '',
			}
		}))

		expect(scheduler.lambda__name).toBeCalledTimes(1)
	})

	it('should throw for unknown lambda', async () => {
		const promise = client.send(new CreateScheduleCommand({
			Name: 'test',
			ScheduleExpression: `at(${(new Date()).toISOString()})`,
			FlexibleTimeWindow: { Mode: 'OFF' },
			Target: {
				Arn: `arn:aws:lambda:eu-west-1:xxx:unknown`,
				RoleArn: '',
			}
		}))

		await expect(promise).rejects.toThrow(TypeError)
	})

	it('should delete a schedule', async () => {
		await client.send(new DeleteScheduleCommand({
			Name: 'test',
			ClientToken: 'test',
		}))
	})
})
