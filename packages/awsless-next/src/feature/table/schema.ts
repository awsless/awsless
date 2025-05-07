import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'

const KeySchema = z.string().min(1).max(255)
// const DeletionProtectionSchema = z
// 	.boolean()
// 	.describe('Specifies if you want to protect the table from being deleted by awsless.')

// export const TableDefaultSchema = z
// 	.object({
// 		deletionProtection: DeletionProtectionSchema.optional(),
// 	})
// 	.optional()

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

			timeToLiveAttribute: KeySchema.optional().describe(
				'The name of the TTL attribute used to store the expiration time for items in the table. To update this property, you must first disable TTL and then enable TTL with the new attribute name.'
			),

			// deletionProtection: DeletionProtectionSchema.optional(),

			stream: z
				.object({
					type: z
						.enum(['keys-only', 'new-image', 'old-image', 'new-and-old-images'])
						.describe(
							'When an item in the table is modified, stream.type determines what information is written to the stream for this table. Valid values are:\n- keys-only - Only the key attributes of the modified item are written to the stream.\n- new-image - The entire item, as it appears after it was modified, is written to the stream.\n- old-image - The entire item, as it appeared before it was modified, is written to the stream.\n- new-and-old-images - Both the new and the old item images of the item are written to the stream.'
						),

					consumer: FunctionSchema.describe('The consuming lambda function for the stream'),
				})
				.optional()
				.describe(
					'The settings for the DynamoDB table stream, which capture changes to items stored in the table.'
				),

			indexes: z
				.record(
					z.string(),
					z.object({
						hash: KeySchema.describe(
							'Specifies the name of the partition / hash key that makes up the primary key for the global secondary index.'
						),
						sort: KeySchema.optional().describe(
							'Specifies the name of the range / sort key that makes up the primary key for the global secondary index.'
						),

						projection: z
							.enum(['all', 'keys-only'])
							.default('all')
							.describe(
								[
									'The set of attributes that are projected into the index:',
									'- all - All of the table attributes are projected into the index.',
									'- keys-only - Only the index and primary keys are projected into the index.',
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
