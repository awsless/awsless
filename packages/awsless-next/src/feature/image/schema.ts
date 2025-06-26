import { z } from 'zod'
import { LocalDirectorySchema } from '../../config/schema/local-directory.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema, LogSchema } from '../function/schema.js'

const transformationOptionsSchema = z.object({
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional(),
	position: z
		.enum(['top', 'right top', 'right', 'right bottom', 'bottom', 'left bottom', 'left', 'left top', 'center'])
		.optional(),
	quality: z.number().int().min(1).max(100).optional(),
})

const staticOriginSchema = LocalDirectorySchema.describe(
	'Specifies the path to a local image directory that will be uploaded in S3.'
)

const functionOriginSchema = FunctionSchema.describe(
	"Specifies the file that will be called when an image isn't found in the (cache) bucket."
)

export const ImagesSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			domain: ResourceIdSchema.describe('The domain id to link your site with.').optional(),
			subDomain: z.string().optional(),
			log: LogSchema.optional(),

			presets: z
				.record(z.string(), transformationOptionsSchema)
				.describe('Named presets for image transformations'),

			extensions: z
				.object({
					jpeg: z
						.object({
							mozjpeg: z.boolean().optional(),
							progressive: z.boolean().optional(),
						})
						.optional(),
					webp: z
						.object({
							effort: z.number().int().min(1).max(10).default(7).optional(),
							lossless: z.boolean().optional(),
							nearLossless: z.boolean().optional(),
						})
						.optional(),
					png: z
						.object({
							compressionLevel: z.number().int().min(0).max(9).default(6).optional(),
						})
						.optional(),
				})
				.refine(data => {
					return Object.keys(data).length > 0
				}, 'At least one extension must be defined.')
				.describe('Specify the allowed extensions.'),

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
					z.object({
						static: staticOriginSchema,
						function: functionOriginSchema,
					}),
				])
				.describe(
					'Specify the origin of your images. Image transformation will be applied from a base image. Base images can be loaded from a S3 bucket (that is synced from a local directory) or dynamicly from a lambda function.'
				),

			version: z.number().int().min(1).optional().describe('Version of the image configuration.'),
		})
	)
	.optional()
	.describe('Define an image proxy in your stack. Store, transform, optimize, and deliver images at scale.')
