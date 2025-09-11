import { z } from 'zod'
import { LocalDirectorySchema } from '../../config/schema/local-directory.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'

export const StoresSchema = z
	.union([
		z.array(ResourceIdSchema).transform(list => {
			const stores: Record<
				string,
				{
					static?: string
					versioning?: boolean
					// deletionProtection?: boolean
					events?: Record<string, z.output<typeof FunctionSchema>>
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
				events: z
					.object({
						// create
						'created:*': FunctionSchema.optional().describe(
							'Subscribe to notifications regardless of the API that was used to create an object.'
						),
						'created:put': FunctionSchema.optional().describe(
							'Subscribe to notifications when an object is created using the PUT API operation.'
						),
						'created:post': FunctionSchema.optional().describe(
							'Subscribe to notifications when an object is created using the POST API operation.'
						),
						'created:copy': FunctionSchema.optional().describe(
							'Subscribe to notifications when an object is created using the COPY API operation.'
						),
						'created:upload': FunctionSchema.optional().describe(
							'Subscribe to notifications when an object multipart upload has been completed.'
						),

						// remove
						'removed:*': FunctionSchema.optional().describe(
							'Subscribe to notifications when an object is deleted or a delete marker for a versioned object is created.'
						),
						'removed:delete': FunctionSchema.optional().describe(
							'Subscribe to notifications when an object is deleted'
						),
						'removed:marker': FunctionSchema.optional().describe(
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
