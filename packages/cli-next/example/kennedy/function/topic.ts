type SnsEvent = {
	Records: Array<{ Sns: { Message: string } }>
}

export default async (event: SnsEvent) => {
	console.log('TOPIC_HANDLER_RAN', process.env.STACK, JSON.stringify(event.Records.map(r => r.Sns.Message)))
}
