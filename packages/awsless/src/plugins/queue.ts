
import { definePlugin } from '../plugin.js';
import { z } from 'zod'
import { FunctionSchema, toLambdaFunction } from './function.js';
import { ResourceIdSchema } from '../schema/resource-id.js';
import { DurationSchema, durationMax, durationMin } from '../schema/duration.js';
import { SizeSchema, sizeMax, sizeMin } from '../schema/size.js';
import { LocalFileSchema } from '../schema/local-file.js';
import { Queue } from '../formation/resource/sqs/queue.js';
import { SqsEventSource } from '../formation/resource/lambda/event-source/sqs.js';
import { getGlobalOnFailure } from './on-failure/util.js';
import { Duration } from '../formation/property/duration.js';
import { Size } from '../formation/property/size.js';
import { TypeGen, TypeObject } from '../util/type-gen.js';
import { formatName } from '../formation/util.js';
import { camelCase, constantCase } from 'change-case';
import { directories } from '../util/path.js';
import { relative } from 'path';

const RetentionPeriodSchema = DurationSchema
	.refine(durationMin(Duration.minutes(1)), 'Minimum retention period is 1 minute')
	.refine(durationMax(Duration.days(14)), 'Maximum retention period is 14 days')

const VisibilityTimeoutSchema = DurationSchema
	.refine(durationMax(Duration.hours(12)), 'Maximum visibility timeout is 12 hours')

const DeliveryDelaySchema = DurationSchema
	.refine(durationMax(Duration.minutes(15)), 'Maximum delivery delay is 15 minutes')

const ReceiveMessageWaitTimeSchema = DurationSchema
	.refine(durationMin(Duration.seconds(1)), 'Minimum receive message wait time is 1 second')
	.refine(durationMax(Duration.seconds(20)), 'Maximum receive message wait time is 20 seconds')

const MaxMessageSizeSchema = SizeSchema
	.refine(sizeMin(Size.kiloBytes(1)), 'Minimum max message size is 1 KB')
	.refine(sizeMax(Size.kiloBytes(256)), 'Maximum max message size is 256 KB')

const BatchSizeSchema = z.number().int()
	.min(1, 'Minimum batch size is 1')
	.max(10000, 'Maximum batch size is 10000')

const MaxConcurrencySchema = z.number().int()
	.min(2, 'Minimum max concurrency is 2')
	.max(1000, 'Maximum max concurrency is 1000')

const MaxBatchingWindow = DurationSchema
	.refine(durationMax(Duration.minutes(5)), 'Maximum max batching window is 5 minutes')

const typeGenCode = `
import { SendMessageOptions, SendMessageBatchOptions, BatchItem } from '@awsless/sqs'

type Payload<Func extends (...args: any[]) => any> = Parameters<Func>[0]['Records'][number]['body']

type Send<Name extends string, Func extends (...args: any[]) => any> = {
	name: Name
	batch(items:BatchItem<Payload<Func>>[], options?:Omit<SendMessageBatchOptions, 'queue' | 'items'>): Promise<void>
	(payload: Payload<Func>, options?: Omit<SendMessageOptions, 'queue' | 'payload'>): Promise<void>
}`

export const queuePlugin = definePlugin({
	name: 'queue',
	schema: z.object({
		defaults: z.object({
			/** Define the defaults properties for all queue's in your app. */
			queue: z.object({
				/** The number of seconds that Amazon SQS retains a message.
				 * You can specify a duration from 1 minute to 14 days.
				 * @default '7 days' */
				retentionPeriod: RetentionPeriodSchema.default('7 days'),

				/** The length of time during which a message will be unavailable after a message is delivered from the queue.
				 * This blocks other components from receiving the same message and gives the initial component time to process and delete the message from the queue.
				 * You can specify a duration from 0 to 12 hours.
				 * @default '30 seconds' */
				visibilityTimeout: VisibilityTimeoutSchema.default('30 seconds'),

				/** The time in seconds for which the delivery of all messages in the queue is delayed.
				 * You can specify a duration from 0 to 15 minutes.
				 * @default '0 seconds' */
				deliveryDelay: DeliveryDelaySchema.default('0 seconds'),

				/** Specifies the duration, in seconds,
				 * that the ReceiveMessage action call waits until a message is in the queue in order to include it in the response,
				 * rather than returning an empty response if a message isn't yet available.
				 * You can specify a duration from 1 to 20 seconds.
				 * Short polling is used as the default. */
				receiveMessageWaitTime: ReceiveMessageWaitTimeSchema.optional(),

				/** The limit of how many bytes that a message can contain before Amazon SQS rejects it.
				 * You can specify an size from 1 KB to 256 KB.
				 * @default '256 KB' */
				maxMessageSize: MaxMessageSizeSchema.default('256 KB'),

				/** The maximum number of records in each batch that Lambda pulls from your queue and sends to your function.
				 * Lambda passes all of the records in the batch to the function in a single call, up to the payload limit for synchronous invocation (6 MB).
				 * You can specify an integer from 1 to 10000.
				 * @default 10 */
				batchSize: BatchSizeSchema.default(10),

				/** Limits the number of concurrent instances that the queue worker can invoke.
				 * You can specify an integer from 2 to 1000. */
				maxConcurrency: MaxConcurrencySchema.optional(),

				/** The maximum amount of time, that Lambda spends gathering records before invoking the function.
				 * You can specify an duration from 0 seconds to 5 minutes.
				 * @default '0 seconds' */
				maxBatchingWindow: MaxBatchingWindow.optional(),

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
						retentionPeriod: RetentionPeriodSchema.optional(),

						/** The length of time during which a message will be unavailable after a message is delivered from the queue.
						 * This blocks other components from receiving the same message and gives the initial component time to process and delete the message from the queue.
						 * You can specify a duration value from 0 to 12 hours.
						 * @default '30 seconds' */
						visibilityTimeout: VisibilityTimeoutSchema.optional(),

						/** The time in seconds for which the delivery of all messages in the queue is delayed.
						 * You can specify a duration value from 0 to 15 minutes.
						 * @default '0 seconds' */
						deliveryDelay: DeliveryDelaySchema.optional(),

						/** Specifies the duration, in seconds,
						 * that the ReceiveMessage action call waits until a message is in the queue in order to include it in the response,
						 * rather than returning an empty response if a message isn't yet available.
						 * You can specify a duration value from 1 to 20 seconds.
						 * Short polling is used as the default. */
						receiveMessageWaitTime: ReceiveMessageWaitTimeSchema.optional(),

						/** The limit of how many bytes that a message can contain before Amazon SQS rejects it.
						 * You can specify an size value from 1 KB to 256 KB.
						 * @default '256 KB' */
						maxMessageSize: MaxMessageSizeSchema.optional(),

						/** The maximum number of records in each batch that Lambda pulls from your queue and sends to your function.
						 * Lambda passes all of the records in the batch to the function in a single call, up to the payload limit for synchronous invocation (6 MB).
						 * You can specify an integer from 1 to 10000.
						 * @default 10 */
						batchSize: BatchSizeSchema.optional(),

						/** Limits the number of concurrent instances that the queue worker can invoke.
						 * You can specify an integer from 2 to 1000. */
						maxConcurrency: MaxConcurrencySchema.optional(),

						/** The maximum amount of time, that Lambda spends gathering records before invoking the function.
						 * You can specify an duration from 0 seconds to 5 minutes.
						 * @default '0 seconds' */
						maxBatchingWindow: MaxBatchingWindow.optional(),
					})
				])
			).optional()
		}).array()
	}),
	onTypeGen({ config }) {
		const types = new TypeGen('@awsless/awsless', 'QueueResources')
		types.addCode(typeGenCode)

		for(const stack of config.stacks) {
			const list = new TypeObject()
			for(const [ name, fileOrProps ] of Object.entries(stack.queues || {})) {
				const varName = camelCase(`${stack.name}-${name}`)
				const queueName = formatName(`${config.name}-${stack.name}-${name}`)

				const file = typeof fileOrProps === 'string'
					? fileOrProps
					: typeof fileOrProps.consumer === 'string'
					? fileOrProps.consumer
					: fileOrProps.consumer.file

				const relFile = relative(directories.types, file)

				types.addImport(varName, relFile)
				list.addType(name, `Send<'${queueName}', typeof ${varName}>`)
			}

			types.addType(stack.name, list.toString())
		}

		return types.toString()
	},
	onStack(ctx) {
		const { stack, config, stackConfig, bind } = ctx

		for(const [ id, functionOrProps ] of Object.entries(stackConfig.queues || {})) {
			const props = typeof functionOrProps === 'string'
				? { ...config.defaults.queue, consumer: functionOrProps }
				: { ...config.defaults.queue, ...functionOrProps }

			const queue = new Queue(id, {
				name: `${config.name}-${stack.name}-${id}`,
				deadLetterArn: getGlobalOnFailure(ctx),
				...props,
			})

			const lambda = toLambdaFunction(ctx, `queue-${id}`, props.consumer)
			const source = new SqsEventSource(id, lambda, {
				queueArn: queue.arn,
				batchSize: props.batchSize,
				maxConcurrency: props.maxConcurrency,
				maxBatchingWindow: props.maxBatchingWindow,
			})

			stack.add(queue, lambda, source)

			bind((lambda) => {
				lambda.addPermissions(queue.permissions)
				lambda.addEnvironment(`QUEUE_${constantCase(stack.name)}_${constantCase(id)}_URL`, queue.url)
			})
		}
	},
})
