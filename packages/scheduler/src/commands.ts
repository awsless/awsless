import { CreateScheduleCommand, SchedulerClient } from '@aws-sdk/client-scheduler'
import { Duration, toSeconds } from '@awsless/duration'
import { stringify } from '@awsless/json'
import { randomUUID } from 'crypto'
import { addSeconds } from 'date-fns'
import { schedulerClient } from './client'

export type CreateSchedule = {
	name: string
	payload?: unknown
	schedule: Date | Duration
	roleArn: string

	group?: string
	client?: SchedulerClient
	idempotentKey?: string
	timezone?: string
	region?: string
	accountId?: string
	deadLetterArn?: string
	retryAttempts?: number
}

const formatScheduleExpression = (schedule: Date | Duration): string => {
	if (schedule instanceof Duration) {
		const now = new Date()
		schedule = addSeconds(now, toSeconds(schedule))
	}

	return schedule.toISOString().split('.').at(0)!
}

export const schedule = async ({
	client = schedulerClient(),
	name,
	group,
	payload,
	schedule,
	idempotentKey,
	roleArn,
	timezone,
	deadLetterArn,
	retryAttempts = 3,
	region = process.env.AWS_REGION,
	accountId = process.env.AWS_ACCOUNT_ID,
}: CreateSchedule) => {
	const command = new CreateScheduleCommand({
		ClientToken: idempotentKey,
		Name: randomUUID(),
		GroupName: group,
		ScheduleExpression: `at(${formatScheduleExpression(schedule)})`,
		ScheduleExpressionTimezone: timezone,
		FlexibleTimeWindow: { Mode: 'OFF' },
		ActionAfterCompletion: 'DELETE',
		Target: {
			Arn: `arn:aws:lambda:${region}:${accountId}:function:${name}`,
			Input: payload ? stringify(payload) : undefined,
			RoleArn: roleArn,
			RetryPolicy: {
				MaximumRetryAttempts: retryAttempts,
			},
			...(deadLetterArn
				? {
						DeadLetterConfig: {
							Arn: deadLetterArn,
						},
					}
				: {}),
		},
	})

	await client.send(command)
}

// await Task.stack.func({ payload }, { schedule: hours(1) })
