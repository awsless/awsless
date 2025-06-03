import { z } from 'zod'
import { LocalDirectorySchema } from '../../config/schema/local-directory.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'

const transformationOptionsSchema = z.object({
	// Resize options
	width: z.number().int().positive().optional(),
	height: z.number().int().positive().optional(),
	fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).optional(),
	position: z
		.enum(['top', 'right top', 'right', 'right bottom', 'bottom', 'left bottom', 'left', 'left top', 'center'])
		.optional(),

	// Format options
	quality: z.number().int().min(1).max(100).optional(),
	progressive: z.boolean().optional(),

	// Processing options
	rotate: z.number().optional(),
	flip: z.boolean().optional(),
	flop: z.boolean().optional(),
	blur: z.number().min(0.3).max(1000).optional(),
	sharpen: z.boolean().optional(),
	grayscale: z.boolean().optional(),
	normalize: z.boolean().optional(),
})

const extensionOptionsSchema = z.object({
	// WebP specific
	effort: z.number().int().min(0).max(6).optional(),
	lossless: z.boolean().optional(),
	nearLossless: z.boolean().optional(),
	// smartSubsample: z.boolean().optional(),

	// JPEG specific
	mozjpeg: z.boolean().optional(),
	// trellisQuantisation: z.boolean().optional(),
	// overshootDeringing: z.boolean().optional(),
	// optimiseScans: z.boolean().optional(),

	// PNG specific
	compressionLevel: z.number().int().min(0).max(9).optional(),
	adaptiveFiltering: z.boolean().optional(),
	// palette: z.boolean().optional(),

	// AVIF specific
	speed: z.number().int().min(0).max(9).optional(),
	// chromaSubsampling: z.string().optional(),
})

const staticOriginSchema = LocalDirectorySchema.describe(
	'Specifies the path to a image directory that will be uploaded in S3.'
)

const functionOriginSchema = FunctionSchema.describe(
	"Specifies the file that will be called when an image isn't found in the S3 bucket."
)

export const ImagesSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			domain: ResourceIdSchema.describe('The domain id to link your site with.').optional(),
			subDomain: z.string().optional(),

			presets: z
				.record(z.string(), transformationOptionsSchema)
				.describe('Named presets for image transformations'),
			extensions: z
				.record(z.enum(['jpeg', 'jpg', 'png', 'webp']), extensionOptionsSchema)
				.describe('Format-specific optimization options'),

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
					'Image transformation will be applied from a base image. Base images orginates from a local directory that will be uploaded to S3 or from a lambda function.'
				),

			// postprocess: FunctionSchema.optional()
		})
	)
	.optional()
	.describe('Define image CDN & transformations in your stack.')
