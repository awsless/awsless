import { Duration, toSeconds } from '@awsless/duration'
import { constantCase } from 'change-case'
import { CloudControlApiResource } from '../cloud-control-api/resource'
import { ARN } from '../types'
import { Input } from '../../../core/output'
import { Node } from '../../../core/node'

export type StartingPosition = 'latest' | 'trim-horizon' | 'at-timestamp'

export type EventSourceMappingProps = {
	functionArn: Input<ARN>
	sourceArn: Input<ARN>
	batchSize?: Input<number>
	maxBatchingWindow?: Input<Duration>
	maxConcurrency?: Input<number>
	maxRecordAge?: Input<Duration>
	bisectBatchOnError?: Input<boolean>
	parallelizationFactor?: Input<number>
	retryAttempts?: Input<number>
	tumblingWindow?: Input<Duration>
	onFailure?: Input<ARN>
	startingPosition?: Input<StartingPosition>
	startingPositionTimestamp?: Input<number>
}

export class EventSourceMapping extends CloudControlApiResource {
	constructor(readonly parent: Node, id: string, private props: EventSourceMappingProps) {
		super(parent, 'AWS::Lambda::EventSourceMapping', id, props)
	}

	setOnFailure(arn: Input<ARN>) {
		this.props.onFailure = arn

		return this
	}

	toState() {
		return {
			document: {
				Enabled: true,
				FunctionName: this.props.functionArn,
				EventSourceArn: this.props.sourceArn,

				...this.attr('BatchSize', this.props.batchSize),
				...this.attr('MaximumBatchingWindowInSeconds', this.props.maxBatchingWindow, toSeconds),
				...this.attr('MaximumRecordAgeInSeconds', this.props.maxRecordAge, toSeconds),
				...this.attr('MaximumRetryAttempts', this.props.retryAttempts),
				...this.attr('ParallelizationFactor', this.props.parallelizationFactor),
				...this.attr('TumblingWindowInSeconds', this.props.tumblingWindow, toSeconds),
				...this.attr('BisectBatchOnFunctionError', this.props.bisectBatchOnError),
				...this.attr('StartingPosition', this.props.startingPosition, constantCase),
				...this.attr('StartingPositionTimestamp', this.props.startingPositionTimestamp),

				...(this.props.maxConcurrency
					? {
							ScalingConfig: {
								MaximumConcurrency: this.props.maxConcurrency,
							},
					  }
					: {}),

				...(this.props.onFailure
					? {
							DestinationConfig: {
								OnFailure: {
									Destination: this.props.onFailure,
								},
							},
					  }
					: {}),
			},
		}
	}
}
