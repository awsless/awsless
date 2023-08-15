import { Duration } from "../../property/duration";
import { Size } from "../../property/size";
import { Resource } from "../../resource";
import { formatName, getAtt } from "../../util";

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

	constructor(logicalId: string, private props: QueueProps = {}) {
		super('AWS::SQS::Queue', logicalId)

		this.name = formatName(this.props.name || logicalId)
	}

	get arn() {
		return getAtt(this.logicalId, 'Arn')
	}

	get url() {
		return getAtt(this.logicalId, 'QueueUrl')
	}

	get permissions() {
		return {
			actions: [
				'sqs:SendMessage',
				'sqs:ReceiveMessage',
				'sqs:GetQueueUrl',
				'sqs:GetQueueAttributes',
			],
			resources: [ this.arn ],
		}
	}

	properties() {
		return {
			QueueName: this.name,
			DelaySeconds: this.props.deliveryDelay?.toSeconds() ?? 0,
			MaximumMessageSize: this.props.maxMessageSize?.toBytes() ?? Size.kiloBytes(256).toBytes(),
			MessageRetentionPeriod: this.props.retentionPeriod?.toSeconds() ?? Duration.days(4).toSeconds(),
			ReceiveMessageWaitTimeSeconds: this.props.receiveMessageWaitTime?.toSeconds() ?? 0,
			VisibilityTimeout: this.props.visibilityTimeout?.toSeconds() ?? 30,
		}
	}
}
