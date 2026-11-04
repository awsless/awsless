import { days, minutes, seconds } from '@awsless/duration'
import { z } from 'zod'
import { durationMax, durationMin, DurationSchema } from '../../config/schema/duration.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { BundledFunctionSchema } from '../function/schema.js'

const KeySchema = z.string().min(1).max(255)

export const TablesSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			hash: KeySchema.describe(
				'Specifies the name of the partition / hash key that makes up the primary key for the table.'
			),
			sort: KeySchema.optional().describe(
				'Specifies the name of the range / sort key that makes up the primary key for the table.'
			),
			fields: z
				.record(z.string(), z.enum(['string', 'number', 'binary']))
				.optional()
				.describe(
					'A list of attributes that describe the key schema for the table and indexes. If no attribute field is defined we default to "string".'
				),

			class: z
				.enum(['standard', 'standard-infrequent-access'])
				.default('standard')
				.describe('The table class of the table.'),

			pointInTimeRecovery: z
				.boolean()
				.default(false)
				.describe('Indicates whether point in time recovery is enabled on the table.'),

			ttl: KeySchema.optional().describe(
				[
					'The name of the TTL attribute used to store the expiration time for items in the table.',
					'To update this property, you must first disable TTL and then enable TTL with the new attribute name.',
				].join('\n')
			),

			stream: z
				.object({
					type: z
						.enum(['keys-only', 'new-image', 'old-image', 'new-and-old-images'])
						.describe(
							[
								'When an item in the table is modified, you can determines what information is written to the stream for this table.',
								'Valid values are:',
								'- keys-only - Only the key attributes of the modified item are written to the stream.',
								'- new-image - The entire item, as it appears after it was modified, is written to the stream.',
								'- old-image - The entire item, as it appeared before it was modified, is written to the stream.',
								'- new-and-old-images - Both the new and the old item images of the item are written to the stream.',
							].join('\n')
						),

					batchSize: z
						.number()
						.min(1)
						.max(10000)
						.default(1)
						.describe(
							[
								'The maximum number of records in each batch that Lambda pulls from your stream and sends to your function.',
								'Lambda passes all of the records in the batch to the function in a single call, up to the payload limit for synchronous invocation (6 MB).',
								'You can specify a number from 1 to 10000.',
							].join('\n')
						),

					batchWindow: DurationSchema.refine(
						durationMin(seconds(1)),
						'Minimum batch window duration is 1 second'
					)
						.refine(durationMax(minutes(5)), 'Maximum batch window duration is 5 minutes')
						.optional()
						.describe(
							[
								'The maximum amount of time that is spend gathering records before invoking the function.',
								'You can specify a duration from 1 seconds to 5 minutes.',
							].join('\n')
						),

					retryAttempts: z
						.number()
						.min(-1)
						.max(10000)
						.default(2)
						.describe(
							[
								'Discard records after the specified number of retries.',
								'-1 will sets the maximum number of retries to infinite.',
								'When maxRetryAttempts is infinite, Lambda retries failed records until the record expires in the event source.',
								'You can specify a number from -1 to 10000.',
								'The default value is 2',
							].join('\n')
						),

					concurrencyPerShard: z
						.number()
						.min(1)
						.max(10)
						.default(1)
						.describe(
							[
								'The number of batches to process concurrently from each shard.',
								'You can specify a number from 1 to 10.',
							].join('\n')
						),

					startingPosition: z
						.enum(['latest', 'trim-horizon'])
						.default('latest')
						.describe(
							[
								'Where a new event source mapping starts reading the stream. It only counts when the mapping is created:',
								'a running mapping keeps its place, so a normal deploy reads nothing twice.',
								'- latest - Only records written after the mapping exists. A mapping that is replaced misses the records written in between.',
								'- trim-horizon - The oldest record the stream still holds (24 hours at most), so a replaced mapping or a new stream misses nothing.',
								'Changing it on an existing mapping replaces the mapping, which then reads from its new starting position once.',
								'@default "latest"',
							].join('\n')
						),

					bisectOnError: z
						.boolean()
						.default(false)
						.describe(
							[
								'Split a batch in two & retry each half when the handler throws, until the failing record is on its own.',
								'Records that fail for good then hold up their shard alone instead of a whole batch.',
							].join('\n')
						),

					maxRecordAge: DurationSchema.refine(durationMin(minutes(1)), 'Minimum record age is 1 minute')
						.refine(durationMax(days(7)), 'Maximum record age is 7 days')
						.optional()
						.describe(
							[
								'Give up on records older than this, sending their batch to the on-failure destination with its payload.',
								'Without it a record is retried until it leaves the stream (24 hours) & is lost there, holding up its shard all that time.',
								'You can specify a duration from 1 minute to 7 days.',
							].join('\n')
						),

					consumer: BundledFunctionSchema.describe(
						[
							'The consuming lambda function for the stream.',
							'It may return `{ batchItemFailures: [{ itemIdentifier }] }` with the `sequenceNumber` of the records that failed:',
							'the stream retries from the first of them, without the records before it.',
						].join('\n')
					),
				})
				.optional()
				.describe(
					'The settings for the DynamoDB table stream, which capture changes to items stored in the table.'
				),

			indexes: z
				.record(
					z.string(),
					z.object({
						hash: z
							.union([KeySchema.transform(v => [v]), KeySchema.array()])
							.describe(
								'Specifies the name of the partition / hash key that makes up the primary key for the global secondary index.'
							),

						sort: z
							.union([KeySchema.transform(v => [v]), KeySchema.array()])
							.optional()
							.describe(
								'Specifies the name of the range / sort key that makes up the primary key for the global secondary index.'
							),

						projection: z
							.union([z.enum(['all', 'keys-only']), z.string().array().min(1)])
							.default('all')
							.describe(
								[
									'The set of attributes that are projected into the index:',
									'- all - All of the table attributes are projected into the index.',
									'- keys-only - Only the index and primary keys are projected into the index.',
									'- a list of attribute names - Only those attributes and the keys are projected into the index (INCLUDE).',
									'@default "all"',
								].join('\n')
							),
					})
				)
				.optional()
				.describe('Specifies the global secondary indexes to be created on the table.'),
		})
	)
	.optional()
	.describe('Define the tables in your stack.')
