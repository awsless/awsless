import { z } from 'zod'
import { DurationSchema } from '../../config/schema/duration.js'
import { LocalDirectorySchema } from '../../config/schema/local-directory.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { BundledFunctionSchema } from '../function/schema.js'
import { RouteSchema } from '../router/schema.js'

const staticOriginSchema = LocalDirectorySchema.describe(
	'Specifies the path to a local image directory that will be uploaded in S3.'
)

const functionOriginSchema = BundledFunctionSchema.describe(
	"Specifies the file that will be called when an image isn't found in the (cache) bucket."
)

export const IconsSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			router: ResourceIdSchema.describe('The router id to link your icon proxy.'),
			path: RouteSchema.describe('The path inside the router to link your icon proxy to.'),

			cacheDuration: DurationSchema.optional().describe('The cache duration of the cached icons.'),

			preserveIds: z.boolean().optional().default(false).describe('Preserve the IDs of the icons.'),
			symbols: z.boolean().optional().default(false).describe(`Convert the SVG's to SVG symbols.`),

			origin: z
				.union([
					z.object({
						static: staticOriginSchema,
						function: functionOriginSchema.optional(),
					}),
					z.object({
						static: staticOriginSchema.optional(),
						function: functionOriginSchema,
					}),
				])
				.describe(
					'Image transformation will be applied from a base image. Base images orginates from a local directory that will be uploaded to S3 or from a lambda function.'
				),
		})
	)
	.optional()
	.describe('Define an svg icon proxy in your stack. Store, optimize, and deliver svg icons at scale.')
