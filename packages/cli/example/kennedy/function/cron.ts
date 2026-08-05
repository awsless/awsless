import { getStack } from 'awsless'

export default async (event: unknown) => {
	console.log('CRON_HANDLER_RAN', getStack(), JSON.stringify(event))
}
