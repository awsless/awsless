
import { definePlugin } from '../plugin.js';
import { z } from 'zod'
import { FunctionSchema, toLambdaFunction } from './function.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { DurationSchema } from '../schema/duration.js';
import { SizeSchema } from '../schema/size.js';
import { LocalFileSchema } from '../schema/local-file.js';
import { Queue } from '../formation/resource/sqs/queue.js';
import { SqsEventSource } from '../formation/resource/lambda/event-source/sqs.js';

export const queuePlugin = definePlugin({
	name: 'queue',
	schema: z.object({
		defaults: z.object({
			/** Define the defaults properties for all queue's in your app. */
			queue: z.object({
				/** The number of seconds that Amazon SQS retains a message.
				 * You can specify a duration value from 1 minute to 14 days.
				 * @default '7 days' */
				retentionPeriod: DurationSchema.default('7 days'),

				/** The length of time during which a message will be unavailable after a message is delivered from the queue.
				 * This blocks other components from receiving the same message and gives the initial component time to process and delete the message from the queue.
				 * You can specify a duration value from 0 to 12 hours.
				 * @default '30 seconds' */
				visibilityTimeout: DurationSchema.default('30 seconds'),

				/** The time in seconds for which the delivery of all messages in the queue is delayed.
				 * You can specify a duration value from 0 to 15 minutes.
				 * @default '0 seconds' */
				deliveryDelay: DurationSchema.default('0 seconds'),

				/** Specifies the duration, in seconds,
				 * that the ReceiveMessage action call waits until a message is in the queue in order to include it in the response,
				 * rather than returning an empty response if a message isn't yet available.
				 * You can specify an integer from 1 to 20.
				 * You can specify a duration value from 1 to 20 seconds.
				 * @default '0 seconds' */
				receiveMessageWaitTime: DurationSchema.default('0 seconds'),

				/** The limit of how many bytes that a message can contain before Amazon SQS rejects it.
				 * You can specify an size value from 1 KB to 256 KB.
				 * @default '256 KB' */
				maxMessageSize: SizeSchema.default('256 KB'),
			}).default({}),
		}).default({}),
		stacks: z.object({
			/** Define the queues in your stack.
			 * @example
			 * {
			 *   queues: {
			 *     QUEUE_NAME: 'function.ts'
			 *   }
			 * }
			 */
			queues: z.record(
				ResourceIdSchema,
				z.union([
					LocalFileSchema,
					z.object({
						/** The consuming lambda function properties. */
						consumer: FunctionSchema,

						/** The number of seconds that Amazon SQS retains a message.
						 * You can specify a duration value from 1 minute to 14 days.
						 * @default '7 days' */
						retentionPeriod: DurationSchema.optional(),

						/** The length of time during which a message will be unavailable after a message is delivered from the queue.
						 * This blocks other components from receiving the same message and gives the initial component time to process and delete the message from the queue.
						 * You can specify a duration value from 0 to 12 hours.
						 * @default '30 seconds' */
						visibilityTimeout: DurationSchema.optional(),

						/** The time in seconds for which the delivery of all messages in the queue is delayed.
						 * You can specify a duration value from 0 to 15 minutes.
						 * @default '0 seconds' */
						deliveryDelay: DurationSchema.optional(),

						/** Specifies the duration, in seconds,
						 * that the ReceiveMessage action call waits until a message is in the queue in order to include it in the response,
						 * rather than returning an empty response if a message isn't yet available.
						 * You can specify a duration value from 1 to 20 seconds.
						 * @default '0 seconds' */
						receiveMessageWaitTime: DurationSchema.optional(),

						/** The limit of how many bytes that a message can contain before Amazon SQS rejects it.
						 * You can specify an size value from 1 KB to 256 KB.
						 * @default '256 KB' */
						maxMessageSize: SizeSchema.optional(),
					})
				])
			).optional()
		}).array()
	}),
	onStack(ctx) {
		const { stack, config, stackConfig, bind } = ctx

		for(const [ id, functionOrProps ] of Object.entries(stackConfig.queues || {})) {
			const props = typeof functionOrProps === 'string'
				? { ...config.defaults.queue, consumer: functionOrProps }
				: { ...config.defaults.queue, ...functionOrProps }

			const queue = new Queue(id, {
				name: `${config.name}-${stack.name}-${id}`,
				...props,
			})

			const lambda = toLambdaFunction(ctx, `queue-${id}`, props.consumer)
			const source = new SqsEventSource(id, lambda, {
				queueArn: queue.arn,
			})

			stack.add(queue, lambda, source)

			bind((lambda) => {
				lambda.addPermissions(queue.permissions)
				// lambda.addEnvironment(`RESOURCE_QUEUE_${stack.name}_${id}`, queue.url)
			})
		}
	},
})
