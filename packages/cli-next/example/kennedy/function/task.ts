export default async (event: unknown) => {
	console.log('TASK_HANDLER_RAN', process.env.STACK, JSON.stringify(event))
}
