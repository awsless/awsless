type SqsEvent = {
	Records: Array<{ body: string }>
}

export default async (event: SqsEvent) => {
	console.log('QUEUE_HANDLER_RAN', process.env.STACK, JSON.stringify(event.Records.map(r => r.body)))
}
