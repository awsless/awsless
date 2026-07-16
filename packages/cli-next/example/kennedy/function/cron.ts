export default async (event: unknown) => {
	console.log('CRON_HANDLER_RAN', process.env.STACK, JSON.stringify(event))
}
