import { z } from 'zod'
import { LocalDirectorySchema } from '../../config/schema/local-directory.js'
import { ConfigNameSchema } from '../config/schema.js'

const PathsSchema = z.union([
	//
	LocalDirectorySchema.transform(v => [v]),
	LocalDirectorySchema.array(),
])

export const EvalsSchema = z
	.union([
		PathsSchema.transform(path => ({ path, configs: [], threshold: 1 })),
		z
			.object({
				path: PathsSchema.describe('The location of your eval files, one directory or several.'),
				configs: ConfigNameSchema.array()
					.default([])
					.describe(
						'The config values loaded from your AWS account for the evals, like the api key of a model provider.'
					),
				threshold: z
					.number()
					.min(0)
					.max(1)
					.default(1)
					.describe(
						'The share of eval cases that must pass, between 0 and 1. Model answers vary between runs, so a few misses can be fine.'
					),
			})
			.strict(),
	])
	.describe('Define the evals for your stack. Evals run against real AI models with the "awsless eval" command.')
	.optional()
