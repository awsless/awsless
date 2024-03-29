import { Duration, days, seconds, toSeconds } from '@awsless/duration'
import { AwsResource } from '../resource.js'
import { ARN } from '../types.js'
import { Size, kibibytes, toBytes } from '@awsless/size'
import { Input, unwrap } from '../../../resource/output.js'

export type QueueProps = {
	name: Input<string>
	retentionPeriod?: Input<Duration>
	visibilityTimeout?: Input<Duration>
	deliveryDelay?: Input<Duration>
	receiveMessageWaitTime?: Input<Duration>
	maxMessageSize?: Input<Size>
	deadLetterArn?: Input<string>
	maxReceiveCount?: Input<number>
}

export class Queue extends AwsResource {
	constructor(id: string, private props: QueueProps) {
		super('AWS::SQS::Queue', id, props)
	}

	setDeadLetter(arn: string) {
		this.props.deadLetterArn = arn
		return this
	}

	get arn() {
		return this.output<ARN>(v => v.Arn)
	}

	get url() {
		return this.output<string>(v => v.QueueUrl)
	}

	get name() {
		return this.output<string>(v => v.QueueName)
	}

	get permissions() {
		return {
			actions: [
				//
				'sqs:SendMessage',
				'sqs:ReceiveMessage',
				'sqs:GetQueueUrl',
				'sqs:GetQueueAttributes',
			],
			resources: [this.arn],
		}
	}

	toState() {
		return {
			document: {
				QueueName: this.props.name,
				Tags: [{ Key: 'name', Value: this.props.name }],
				DelaySeconds: toSeconds(unwrap(this.props.deliveryDelay, seconds(0))),
				MaximumMessageSize: toBytes(unwrap(this.props.maxMessageSize, kibibytes(256))),
				MessageRetentionPeriod: toSeconds(unwrap(this.props.retentionPeriod, days(4))),
				ReceiveMessageWaitTimeSeconds: toSeconds(unwrap(this.props.receiveMessageWaitTime, seconds(0))),
				VisibilityTimeout: toSeconds(unwrap(this.props.visibilityTimeout, seconds(30))),
				...(this.props.deadLetterArn
					? {
							RedrivePolicy: {
								deadLetterTargetArn: this.props.deadLetterArn,
								maxReceiveCount: unwrap(this.props.maxReceiveCount, 100),
							},
					  }
					: {}),
			},
		}
	}
}
