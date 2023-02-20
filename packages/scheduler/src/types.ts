import { SchedulerClient } from '@aws-sdk/client-scheduler'

export interface CreateSchedule {
	client?: SchedulerClient

	lambda: string
	payload: unknown
	date: Date
	idempotentKey: string
	roleArn: string

	timezone?: string
	region?: string
	accountId?: string
}

export interface DeleteSchedule {
	client?: SchedulerClient
	idempotentKey: string
}
