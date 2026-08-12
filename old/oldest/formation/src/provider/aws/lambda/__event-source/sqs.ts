import { Duration } from '../../../property/duration.js'
import { Group } from '../../../resource.js'
import { EventSourceMapping } from '../event-source-mapping.js'
import { Function } from '../function.js'

export class SqsEventSource extends Group {
	constructor(id: string, lambda:Function, props: {
		queueArn: string
		batchSize?: number
		maxBatchingWindow?: Duration
		maxConcurrency?: number
	}) {
		const source = new EventSourceMapping(id, {
			functionArn: lambda.arn,
			sourceArn: props.queueArn,
			batchSize: props.batchSize ?? 10,
			maxBatchingWindow: props.maxBatchingWindow,
			maxConcurrency: props.maxConcurrency,
		})

		lambda.addPermissions({
			actions: [
				'sqs:ReceiveMessage',
				'sqs:DeleteMessage',
				'sqs:GetQueueAttributes',
			],
			resources: [ props.queueArn ]
		})

		super([ source ])
	}
}
