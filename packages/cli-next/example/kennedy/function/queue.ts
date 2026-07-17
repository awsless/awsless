import { getStack } from 'awsless'

type SqsEvent = {
	Records: Array<{ body: string }>
}

export default async (event: SqsEvent) => {
	console.log('QUEUE_HANDLER_RAN', getStack(), JSON.stringify(event.Records.map(r => r.body)))
}
