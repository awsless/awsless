import { days } from '@awsless/duration'
import { z } from 'zod'
import { DurationSchema, durationMin } from '../../config/schema/duration.js'
import { LocalDirectorySchema } from '../../config/schema/local-directory.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { TaskSchema } from '../task/schema.js'

const LifecycleRuleSchema = z.object({
	prefix: z
		.string()
		.optional()
		.describe('Object-key prefix this rule applies to. Omit to apply bucket-wide.'),
	expiration: DurationSchema.refine(durationMin(days(1)), 'Minimum expiration is 1 day').describe(
		'How long objects matching this rule live before S3 deletes them.'
	),
})

export const StoresSchema = z
	.union([
		z.array(ResourceIdSchema).transform(list => {
			const stores: Record<
				string,
				{
					static?: string
					versioning?: boolean
					// deletionProtection?: boolean
					lifecycle?: z.output<typeof LifecycleRuleSchema>[]
					events?: Record<string, z.output<typeof TaskSchema>>
				}
			> = {}

			for (const key of list) {
				stores[key] = {}
			}

			return stores
		}),
		z.record(
			ResourceIdSchema,
			z.object({
				static: LocalDirectorySchema.optional().describe('Specifies the path to the static files directory.'),
				versioning: z.boolean().default(false).describe('Enable versioning of your store.'),
				lifecycle: z
					.array(LifecycleRuleSchema)
					.optional()
					.describe('S3 lifecycle rules for this store. Each rule expires objects matching an optional prefix.'),
				events: z
					.object({
						// create
						'created:*': TaskSchema.optional().describe(
							'Subscribe to notifications regardless of the API that was used to create an object.'
						),
						'created:put': TaskSchema.optional().describe(
							'Subscribe to notifications when an object is created using the PUT API operation.'
						),
						'created:post': TaskSchema.optional().describe(
							'Subscribe to notifications when an object is created using the POST API operation.'
						),
						'created:copy': TaskSchema.optional().describe(
							'Subscribe to notifications when an object is created using the COPY API operation.'
						),
						'created:upload': TaskSchema.optional().describe(
							'Subscribe to notifications when an object multipart upload has been completed.'
						),

						// remove
						'removed:*': TaskSchema.optional().describe(
							'Subscribe to notifications when an object is deleted or a delete marker for a versioned object is created.'
						),
						'removed:delete': TaskSchema.optional().describe(
							'Subscribe to notifications when an object is deleted'
						),
						'removed:marker': TaskSchema.optional().describe(
							'Subscribe to notifications when a delete marker for a versioned object is created.'
						),
					})
					.optional()
					.describe('Describes the store events you want to subscribe too.'),
			})
		),
	])
	.optional()
	.describe('Define the stores in your stack.')
