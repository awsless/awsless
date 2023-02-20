import { SchedulerClient } from '@aws-sdk/client-scheduler'
import { globalClient } from '@awsless/utils'

export const schedulerClient = globalClient(() => {
	return new SchedulerClient({})
})
