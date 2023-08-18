
import { constantCase } from "change-case";
import { Duration } from "../../property/duration";
import { Resource } from "../../resource";

export type StartingPosition = 'latest' | 'trim-horizon' | 'at-timestamp'

export type EventSourceMappingProps = {
	functionArn: string
	sourceArn: string
	batchSize?: number
	maxBatchingWindow?: Duration
	maxConcurrency?: number
	maxRecordAge?: Duration
	bisectBatchOnError?: boolean
	parallelizationFactor?: number
	retryAttempts?: number
	tumblingWindow?: Duration
	onFailure?: string
	startingPosition?: StartingPosition
	startingPositionTimestamp?: number
}

export class EventSourceMapping extends Resource {

	constructor(logicalId: string, private props: EventSourceMappingProps) {
		super('AWS::Lambda::EventSourceMapping', logicalId)
	}

	setOnFailure(arn: string) {
		this.props.onFailure = arn

		return this
	}

	properties() {
		return {
			Enabled: true,
			FunctionName: this.props.functionArn,
			EventSourceArn: this.props.sourceArn,

			...this.attr('BatchSize',						this.props.batchSize),
			...this.attr('MaximumBatchingWindowInSeconds',	this.props.maxBatchingWindow?.toSeconds()),
			...this.attr('MaximumRecordAgeInSeconds',		this.props.maxRecordAge?.toSeconds()),
			...this.attr('MaximumRetryAttempts',			this.props.retryAttempts),
			...this.attr('ParallelizationFactor',			this.props.parallelizationFactor),
			...this.attr('TumblingWindowInSeconds',			this.props.tumblingWindow?.toSeconds()),
			...this.attr('BisectBatchOnFunctionError',		this.props.bisectBatchOnError),
			...this.attr('StartingPosition',				this.props.startingPosition && constantCase(this.props.startingPosition)),
			...this.attr('StartingPositionTimestamp',		this.props.startingPositionTimestamp),

			...(this.props.maxConcurrency ? {
				ScalingConfig: {
					MaximumConcurrency: this.props.maxConcurrency
				},
			}: {}),

			...(this.props.onFailure ? {
				DestinationConfig: {
					OnFailure: {
						Destination: this.props.onFailure,
					}
				}
			} : {}),
		}
	}
}
