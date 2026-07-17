import { getStack } from 'awsless'

type SnsEvent = {
	Records: Array<{ Sns: { Message: string } }>
}

export default async (event: SnsEvent) => {
	console.log('TOPIC_HANDLER_RAN', getStack(), JSON.stringify(event.Records.map(r => r.Sns.Message)))
}
