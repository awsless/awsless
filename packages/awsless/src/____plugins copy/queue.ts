
import { definePlugin } from '../plugin.js';
import { z } from 'zod'
import { addResourceEnvironment, toId, toName } from '../util/__resource.js';
import { FunctionSchema, toFunction } from './function/index.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { DurationSchema } from '../schema/duration.js';
import { SizeSchema } from '../schema/size.js';
import { Queue } from "aws-cdk-lib/aws-sqs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { LocalFileSchema } from '../schema/local-file.js';

export const queuePlugin = definePlugin({
	name: 'queue',
	schema: z.object({
		defaults: z.object({
			queue: z.object({
				// fifo: z.boolean().default(false),
				retentionPeriod: DurationSchema.default('7 days'),
				visibilityTimeout: DurationSchema.default('30 seconds'),
				deliveryDelay: DurationSchema.default('0 seconds'),
				receiveMessageWaitTime: DurationSchema.default('0 seconds'),
				maxMessageSize: SizeSchema.default('256 KB'),
			}).default({}),
		}).default({}),
		stacks: z.object({
			queues: z.record(ResourceIdSchema, z.union([
				LocalFileSchema,
				z.object({
					consumer: FunctionSchema,
					// fifo: z.boolean().optional(),
					retentionPeriod: DurationSchema.optional(),
					visibilityTimeout: DurationSchema.optional(),
					deliveryDelay: DurationSchema.optional(),
					receiveMessageWaitTime: DurationSchema.optional(),
					maxMessageSize: SizeSchema.optional(),
				})
			])).optional()
		}).array()
	}),
	onStack(ctx) {
		const { stack, config, stackConfig, bind } = ctx
		return Object.entries(stackConfig.queues || {}).map(([ id, functionOrProps ]) => {

			const props = typeof functionOrProps === 'string'
				? { ...config.defaults.queue, consumer: functionOrProps }
				: { ...config.defaults.queue, ...functionOrProps }

			const queue = new Queue(stack, toId('queue', id), {
				queueName: toName(stack, id),
				...props,
				maxMessageSizeBytes: props.maxMessageSize.toBytes()
			})

			const lambda = toFunction(ctx as any, id, props.consumer)
			lambda.addEventSource(new SqsEventSource(queue))
			// queue.grantConsumeMessages(lambda)

			bind(lambda => {
				queue.grantSendMessages(lambda)
				addResourceEnvironment(stack, 'queue', id, lambda)
			})

			return lambda
		})
	},
})


// import { Duration, toDuration } from '../util/duration.js'
// import { FunctionConfig, toFunction } from './function.js'
// import { Queue } from 'aws-cdk-lib/aws-sqs'
// import { Size, toSize } from '../util/size.js'
// import { Context } from '../stack.js'
// import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
// import { Function } from 'aws-cdk-lib/aws-lambda'
// import { addResourceEnvironment, toId, toName } from '../util/resource.js'

// export type QueueDefaults = {
// 	fifo?: boolean
// 	retentionPeriod?: Duration
// 	visibilityTimeout?: Duration
// 	deliveryDelay?: Duration
// 	receiveMessageWaitTime?: Duration
// 	maxMessageSizeBytes?: Size
// }

// export type QueueConfig = string | {
// 	consumer: FunctionConfig
// } & QueueDefaults

// type Props = Omit<Exclude<QueueConfig, string>, 'consumer'>

// export const toQueue = (ctx:Context, id:string, params:QueueConfig) => {

// 	const props:Props = typeof params !== 'string' ? { ...ctx.config.defaults?.queue, ...params } : ctx.config.defaults?.queue || {}
// 	const functionProps = typeof params === 'string' ? params : params.consumer

// 	const { stack } = ctx
// 	const { lambda } = toFunction(ctx, id, functionProps)

// 	const queue = new Queue(stack, toId('queue', id), {
// 		queueName: toName(stack, id),
// 		fifo: props.fifo,
// 		retentionPeriod: toDuration(props.retentionPeriod || '7 days'),
// 		visibilityTimeout: toDuration(props.visibilityTimeout || '30 seconds'),
// 		deliveryDelay: toDuration(props.deliveryDelay || '0 seconds'),
// 		receiveMessageWaitTime: toDuration(props.receiveMessageWaitTime || '0 seconds'),
// 		maxMessageSizeBytes: toSize(props.maxMessageSizeBytes || '256 KB').toBytes(),
// 	})

// 	lambda.addEventSource(new SqsEventSource(queue))
// 	// queue.grantConsumeMessages(lambda)

// 	return {
// 		queue,
// 		lambda,
// 		bind(lambda: Function) {
// 			queue.grantSendMessages(lambda)
// 			addResourceEnvironment(stack, 'queue', id, lambda)
// 		}
// 	}
// }
