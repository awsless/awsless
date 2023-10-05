import { Duration } from '../../../property/duration.js'
import { Group } from '../../../resource.js'
import { EventSourceMapping, StartingPosition } from '../event-source-mapping.js'
import { Function } from '../function.js'

export class DynamoDBEventSource extends Group {
	constructor(id: string, lambda:Function, props: {
		tableArn: string
		batchSize?: number
		bisectBatchOnError?: boolean
		maxBatchingWindow?: Duration
		maxRecordAge?: Duration
		retryAttempts?: number
		parallelizationFactor?: number
		startingPosition?: StartingPosition
		startingPositionTimestamp?: number
		tumblingWindow?: Duration
		onFailure?: string
	}) {
		const source = new EventSourceMapping(id, {
			functionArn: lambda.arn,
			sourceArn: props.tableArn,
			batchSize: props.batchSize ?? 100,
			bisectBatchOnError: props.bisectBatchOnError ?? true,
			maxBatchingWindow: props.maxBatchingWindow,
			maxRecordAge: props.maxRecordAge,
			retryAttempts: props.retryAttempts ?? -1,
			parallelizationFactor: props.parallelizationFactor ?? 1,
			startingPosition: props.startingPosition,
			startingPositionTimestamp: props.startingPositionTimestamp,
			tumblingWindow: props.tumblingWindow,
			onFailure: props.onFailure,
		})

		lambda.addPermissions({
			actions: [
				'dynamodb:ListStreams',
				'dynamodb:DescribeStream',
				'dynamodb:GetRecords',
				'dynamodb:GetShardIterator',
			],
			resources: [ props.tableArn ]
		})

		super([ source ])
	}
}
