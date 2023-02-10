
import { SchedulerClient } from '@aws-sdk/client-scheduler'
import { globalClient } from '../helper.js'

export const schedulerClient = globalClient(() => {
	return new SchedulerClient({})
})
