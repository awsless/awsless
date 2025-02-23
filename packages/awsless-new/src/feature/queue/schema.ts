import { days, hours, minutes, seconds } from '@awsless/duration'
import { kibibytes } from '@awsless/size'
import { z } from 'zod'
import { DurationSchema, durationMax, durationMin } from '../../config/schema/duration.js'
import { LocalFileSchema } from '../../config/schema/local-file.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { SizeSchema, sizeMax, sizeMin } from '../../config/schema/size.js'
import { FunctionSchema } from '../function/schema.js'

export const RetentionPeriodSchema = DurationSchema.refine(
	durationMin(minutes(1)),
	'Minimum retention period is 1 minute'
)
	.refine(durationMax(days(14)), 'Maximum retention period is 14 days')
	.describe(
		'The number of seconds that Amazon SQS retains a message. You can specify a duration from 1 minute to 14 days.'
	)

export const VisibilityTimeoutSchema = DurationSchema.refine(
	durationMax(hours(12)),
	'Maximum visibility timeout is 12 hours'
).describe(
	'The length of time during which a message will be unavailable after a message is delivered from the queue. This blocks other components from receiving the same message and gives the initial component time to process and delete the message from the queue. You can specify a duration from 0 to 12 hours.'
)

export const DeliveryDelaySchema = DurationSchema.refine(
	durationMax(minutes(15)),
	'Maximum delivery delay is 15 minutes'
).describe(
	'The time in seconds for which the delivery of all messages in the queue is delayed. You can specify a duration from 0 to 15 minutes.'
)

export const ReceiveMessageWaitTimeSchema = DurationSchema.refine(
	durationMin(seconds(1)),
	'Minimum receive message wait time is 1 second'
)
	.refine(durationMax(seconds(20)), 'Maximum receive message wait time is 20 seconds')
	.describe(
		"Specifies the duration, that the ReceiveMessage action call waits until a message is in the queue in order to include it in the response, rather than returning an empty response if a message isn't yet available. You can specify a duration from 1 to 20 seconds. Short polling is used as the default."
	)

export const MaxMessageSizeSchema = SizeSchema.refine(sizeMin(kibibytes(1)), 'Minimum max message size is 1 KB')
	.refine(sizeMax(kibibytes(256)), 'Maximum max message size is 256 KB')
	.describe(
		'The limit of how many bytes that a message can contain before Amazon SQS rejects it. You can specify an size from 1 KB to 256 KB.'
	)

export const BatchSizeSchema = z
	.number()
	.int()
	.min(1, 'Minimum batch size is 1')
	.max(10000, 'Maximum batch size is 10000')
	.describe(
		'The maximum number of records in each batch that Lambda pulls from your queue and sends to your function. Lambda passes all of the records in the batch to the function in a single call, up to the payload limit for synchronous invocation (6 MB). You can specify an integer from 1 to 10000.'
	)

export const MaxConcurrencySchema = z
	.number()
	.int()
	.min(2, 'Minimum max concurrency is 2')
	.max(1000, 'Maximum max concurrency is 1000')
	.describe(
		'Limits the number of concurrent instances that the queue worker can invoke. You can specify an integer from 2 to 1000.'
	)

export const MaxBatchingWindow = DurationSchema.refine(
	durationMax(minutes(5)),
	'Maximum max batching window is 5 minutes'
).describe(
	'The maximum amount of time, that Lambda spends gathering records before invoking the function. You can specify an duration from 0 seconds to 5 minutes.'
)

export const QueueDefaultSchema = z
	.object({
		retentionPeriod: RetentionPeriodSchema.default('7 days'),
		visibilityTimeout: VisibilityTimeoutSchema.default('30 seconds'),
		deliveryDelay: DeliveryDelaySchema.default('0 seconds'),
		receiveMessageWaitTime: ReceiveMessageWaitTimeSchema.optional(),
		maxMessageSize: MaxMessageSizeSchema.default('256 KB'),
		batchSize: BatchSizeSchema.default(10),
		maxConcurrency: MaxConcurrencySchema.optional(),
		maxBatchingWindow: MaxBatchingWindow.optional(),
	})
	.default({})

const QueueSchema = z.object({
	consumer: FunctionSchema.describe('The consuming lambda function properties.'),
	retentionPeriod: RetentionPeriodSchema.optional(),
	visibilityTimeout: VisibilityTimeoutSchema.optional(),
	deliveryDelay: DeliveryDelaySchema.optional(),
	receiveMessageWaitTime: ReceiveMessageWaitTimeSchema.optional(),
	maxMessageSize: MaxMessageSizeSchema.optional(),
	batchSize: BatchSizeSchema.optional(),
	maxConcurrency: MaxConcurrencySchema.optional(),
	maxBatchingWindow: MaxBatchingWindow.optional(),
})

export const QueuesSchema = z
	.record(
		ResourceIdSchema,
		z.union([
			LocalFileSchema.transform(consumer => ({
				consumer,
			})).pipe(QueueSchema),
			QueueSchema,
		])
	)
	.optional()
	.describe('Define the queues in your stack.')
