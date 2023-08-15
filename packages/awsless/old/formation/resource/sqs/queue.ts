import { Duration } from "../../property/duration";
import { Size } from "../../property/size";
import { Resource } from "../../resource";
import { Stack } from "../../stack";
import { formatName, ref } from "../../util";

export type QueueProps = {
	name?: string
	retentionPeriod?: Duration
	visibilityTimeout?: Duration
	deliveryDelay?: Duration
	receiveMessageWaitTime?: Duration
	maxMessageSize?: Size
}

export class Queue extends Resource {
	readonly name: string

	constructor(readonly logicalId: string, private props: QueueProps = {}) {
		super('sqs', 'queue', logicalId)

		this.name = formatName(this.props.name || logicalId)
	}

	get arn() {
		return ref(`${ this.logicalId }Queue`)
	}

	get permissions() {
		return {
			action: [
				'sqs:SendMessage',
				'sqs:ReceiveMessage',
				'sqs:GetQueueUrl',
				'sqs:GetQueueAttributes',
			],
			resource: [ this.arn ],
		}
	}

	template(stack:Stack) {
		return {
			[ `${ this.logicalId }Queue` ]: {
				Type: 'AWS::SQS::Queue',
				Properties: {
					QueueName: stack.formatResourceName(this.name),
					DelaySeconds: this.props.deliveryDelay?.toSeconds() ?? 0,
					MaximumMessageSize: this.props.maxMessageSize?.toBytes() ?? Size.kiloBytes(256).toBytes(),
					MessageRetentionPeriod: this.props.retentionPeriod?.toSeconds() ?? Duration.days(4).toSeconds(),
					ReceiveMessageWaitTimeSeconds: this.props.receiveMessageWaitTime?.toSeconds() ?? 0,
					VisibilityTimeout: this.props.visibilityTimeout?.toSeconds() ?? 30,
				}
			}
		}
	}
}
