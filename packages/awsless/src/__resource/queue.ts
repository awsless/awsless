import { Duration, toDuration } from '../util/duration'
import { FunctionConfig, toFunction } from './function'
import { Queue } from 'aws-cdk-lib/aws-sqs'
import { Size, toSize } from '../util/size'
import { Context } from '../stack'
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { Function } from 'aws-cdk-lib/aws-lambda'
import { addResourceEnvironment, toId, toName } from '../util/resource'

export type QueueDefaults = {
	fifo?: boolean
	retentionPeriod?: Duration
	visibilityTimeout?: Duration
	deliveryDelay?: Duration
	receiveMessageWaitTime?: Duration
	maxMessageSizeBytes?: Size
}

export type QueueConfig = string | {
	consumer: FunctionConfig
} & QueueDefaults

type Props = Omit<Exclude<QueueConfig, string>, 'consumer'>

export const toQueue = (ctx:Context, id:string, params:QueueConfig) => {

	const props:Props = typeof params !== 'string' ? { ...ctx.config.defaults?.queue, ...params } : ctx.config.defaults?.queue || {}
	const functionProps = typeof params === 'string' ? params : params.consumer

	const { stack } = ctx
	const { lambda } = toFunction(ctx, id, functionProps)

	const queue = new Queue(stack, toId('queue', id), {
		queueName: toName(stack, id),
		fifo: props.fifo,
		retentionPeriod: toDuration(props.retentionPeriod || '7 days'),
		visibilityTimeout: toDuration(props.visibilityTimeout || '30 seconds'),
		deliveryDelay: toDuration(props.deliveryDelay || '0 seconds'),
		receiveMessageWaitTime: toDuration(props.receiveMessageWaitTime || '0 seconds'),
		maxMessageSizeBytes: toSize(props.maxMessageSizeBytes || '256 KB').toBytes(),
	})

	lambda.addEventSource(new SqsEventSource(queue))
	// queue.grantConsumeMessages(lambda)

	return {
		queue,
		lambda,
		bind(lambda: Function) {
			queue.grantSendMessages(lambda)
			addResourceEnvironment(stack, 'queue', id, lambda)
		}
	}
}
