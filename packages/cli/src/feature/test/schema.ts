import { z } from 'zod'
import { LocalDirectorySchema } from '../../config/schema/local-directory.js'

export const TestsSchema = z
	.union([
		//
		LocalDirectorySchema.transform(v => [v]),
		LocalDirectorySchema.array(),
		z.literal(false),
	])
	.describe('Define the location of your tests for your stack.')
	.optional()

export const TestDefaultSchema = z
	.object({
		configs: z
			.record(z.string(), z.string())
			.default({})
			.describe(
				'The config values used when running your tests. Every declared config a test imports needs a value here.'
			),
	})
	.strict()
	.default({})
	.describe('Configure how your tests run.')
