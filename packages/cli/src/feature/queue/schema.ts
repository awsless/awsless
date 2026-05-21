import { days, hours, minutes, seconds } from '@awsless/duration'
import { kibibytes } from '@awsless/size'
import { z } from 'zod'
import { DurationSchema, durationMax, durationMin } from '../../config/schema/duration.js'
import { LocalFileSchema } from '../../config/schema/local-file.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { SizeSchema, sizeMax, sizeMin } from '../../config/schema/size.js'
import { FunctionSchema } from '../function/schema.js'

const RetentionPeriodSchema = DurationSchema.refine(durationMin(minutes(1)), 'Minimum retention period is 1 minute')
	.refine(durationMax(days(14)), 'Maximum retention period is 14 days')
	.describe(
		'The number of seconds that Amazon SQS retains a message. You can specify a duration from 1 minute to 14 days.'
	)

const VisibilityTimeoutSchema = DurationSchema.refine(
	durationMax(hours(12)),
	'Maximum visibility timeout is 12 hours'
).describe(
	'The length of time during which a message will be unavailable after a message is delivered from the queue. You can specify a duration from 0 to 12 hours.'
)

const ReceiveMessageWaitTimeSchema = DurationSchema.refine(
	durationMin(seconds(1)),
	'Minimum receive message wait time is 1 second'
)
	.refine(durationMax(seconds(20)), 'Maximum receive message wait time is 20 seconds')
	.describe('Long-polling wait time. You can specify a duration from 1 to 20 seconds.')

const MaxMessageSizeSchema = SizeSchema.refine(sizeMin(kibibytes(1)), 'Minimum max message size is 1 KB')
	.refine(sizeMax(kibibytes(256)), 'Maximum max message size is 256 KB')
	.describe('Message size limit. You can specify a size from 1 KB to 256 KB.')

const BatchSizeSchema = z
	.number()
	.int()
	.min(1, 'Minimum batch size is 1')
	.max(10, 'FIFO queues support a maximum batch size of 10')
	.describe('The maximum number of records per batch. FIFO queues are capped at 10.')

export const QueueDefaultSchema = z
	.object({
		retentionPeriod: RetentionPeriodSchema.default('7 days'),
		visibilityTimeout: VisibilityTimeoutSchema.default('2 minutes'),
		receiveMessageWaitTime: ReceiveMessageWaitTimeSchema.optional(),
		maxMessageSize: MaxMessageSizeSchema.default('256 KB'),
		batchSize: BatchSizeSchema.default(10),
	})
	.default({})

const QueueSchema = z.object({
	consumer: FunctionSchema.optional().describe('The consuming lambda function properties.'),
	retentionPeriod: RetentionPeriodSchema.optional(),
	visibilityTimeout: VisibilityTimeoutSchema.optional(),
	receiveMessageWaitTime: ReceiveMessageWaitTimeSchema.optional(),
	maxMessageSize: MaxMessageSizeSchema.optional(),
	batchSize: BatchSizeSchema.optional(),
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
	.describe(
		'Define the queues in your stack. Queues are FIFO with required per-message groupId: messages with the same groupId are processed strictly in order; different groupIds parallelize.'
	)
