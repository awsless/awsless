import { z } from 'zod'
import { LocalFileSchema } from '../../config/schema/local-file.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'

export const CommandSchema = z.union([
	z.object({
		file: LocalFileSchema,
		handler: z.string().default('default').describe('The name of the handler that needs to run'),
		description: z.string().optional().describe('A description of the command'),
	}),
	LocalFileSchema.transform(file => ({
		file,
		handler: 'default',
		description: undefined,
	})),
])

export const CommandsSchema = z
	.record(ResourceIdSchema, CommandSchema)
	.optional()
	.describe('Define the custom commands for your stack.')
