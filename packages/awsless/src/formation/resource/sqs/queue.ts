import { Duration } from '../../property/duration.js'
import { Size } from '../../property/size.js'
import { Resource } from '../../resource.js'
import { formatArn, formatName } from '../../util.js'

export type QueueProps = {
	name?: string
	retentionPeriod?: Duration
	visibilityTimeout?: Duration
	deliveryDelay?: Duration
	receiveMessageWaitTime?: Duration
	maxMessageSize?: Size
	deadLetterArn?: string
	maxReceiveCount?: number
}

export class Queue extends Resource {
	readonly name: string

	constructor(logicalId: string, private props: QueueProps = {}) {
		super('AWS::SQS::Queue', logicalId)

		this.name = formatName(this.props.name || logicalId)

		this.tag('name', this.name)
	}

	setDeadLetter(arn: string) {
		this.props.deadLetterArn = arn
		return this
	}

	get arn() {
		return this.getAtt('Arn')
	}

	get url() {
		return this.getAtt('QueueUrl')
	}

	get permissions() {
		return {
			actions: ['sqs:SendMessage', 'sqs:ReceiveMessage', 'sqs:GetQueueUrl', 'sqs:GetQueueAttributes'],
			resources: [
				formatArn({
					service: 'sqs',
					resource: this.name,
				}),
			],
		}
	}

	protected properties() {
		return {
			QueueName: this.name,
			DelaySeconds: this.props.deliveryDelay?.toSeconds() ?? 0,
			MaximumMessageSize: this.props.maxMessageSize?.toBytes() ?? Size.kiloBytes(256).toBytes(),
			MessageRetentionPeriod: this.props.retentionPeriod?.toSeconds() ?? Duration.days(4).toSeconds(),
			ReceiveMessageWaitTimeSeconds: this.props.receiveMessageWaitTime?.toSeconds() ?? 0,
			VisibilityTimeout: this.props.visibilityTimeout?.toSeconds() ?? 30,
			...(this.props.deadLetterArn
				? {
						RedrivePolicy: {
							deadLetterTargetArn: this.props.deadLetterArn,
							maxReceiveCount: this.props.maxReceiveCount ?? 100,
						},
				  }
				: {}),
		}
	}
}
