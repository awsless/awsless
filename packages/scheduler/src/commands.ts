import { CreateScheduleCommand, DeleteScheduleCommand } from '@aws-sdk/client-scheduler'
import { schedulerClient } from './client'
import { CreateSchedule, DeleteSchedule } from './types'

export const schedule = async ({
	client = schedulerClient(),
	lambda,
	payload,
	date,
	idempotentKey,
	roleArn,
	timezone,
	region = process.env.REGION,
	accountId = process.env.AWS_ACCOUNT_ID,
}: CreateSchedule) => {
	const command = new CreateScheduleCommand({
		ClientToken: idempotentKey,
		Name: idempotentKey,
		ScheduleExpression: `at(${date.toISOString().split('.')[0]})`,
		ScheduleExpressionTimezone: timezone || undefined,
		FlexibleTimeWindow: { Mode: 'OFF' },
		Target: {
			Arn: `arn:aws:lambda:${region}:${accountId}:function:${lambda}`,
			Input: payload ? JSON.stringify(payload) : undefined,
			RoleArn: roleArn,
		},
	})

	return client.send(command)
}

export const deleteSchedule = ({ client = schedulerClient(), idempotentKey }: DeleteSchedule) => {
	const command = new DeleteScheduleCommand({
		ClientToken: idempotentKey,
		Name: idempotentKey,
	})

	return client.send(command)
}
