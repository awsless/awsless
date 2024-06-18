import { z } from 'zod'
import { LocalFileSchema } from '../../config/schema/local-file.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'

// const ConfigNameSchema = z.string().regex(/[a-z0-9\-]/g, 'Invalid config name')

// export const OptionSchema = z.union([
// 	z.object({
// 		description: z.string(),
// 		default: z.unknown().optional(),
// 	}),
// 	z.string().transform(description => ({ description })),
// ])

// export const ArgumentSchema = z.union([
// 	z.object({
// 		description: z.string(),
// 		default: z.unknown().optional(),
// 	}),
// 	z.string().transform(description => ({ description })),
// ])

export const CommandSchema = z.union([
	z.object({
		file: LocalFileSchema,
		handler: z.string().default('default').describe('The name of the handler that needs to run'),
		description: z.string().optional().describe('A description of the command'),
		// options: z.record(ResourceIdSchema, OptionSchema).optional(),
		// arguments: z.record(ResourceIdSchema, ArgumentSchema).optional(),
	}),
	z.string().transform(file => ({
		file,
		handler: 'default',
		description: undefined,
	})),
])

export const CommandsSchema = z
	.record(ResourceIdSchema, CommandSchema)
	.optional()
	.describe('Define the custom commands for your stack.')

// const commands = {
// 	'generate-seed-chain': {
// 		description: 'Generate a seed-chain for a specific game',
// 		arguments: {
// 			'<game>': 'The game id',
// 		},
// 		options: {
// 			'-l, --length': ['The length of the seed-chain', 10000000],
// 		},
// 	},
// }

// const commands2 = {
// 	'generate-seed-chain': {
// 		description: 'Generate a seed-chain for a specific game',
// 		arguments: { game: 'The game id' },
// 		options: { length: 'The length of the seed-chain' },
// 	},
// }
