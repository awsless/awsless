import { z } from 'zod'
import { LocalDirectorySchema } from '../../config/schema/local-directory.js'
import { LocalEntrySchema } from '../../config/schema/local-entry.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'
import { RouteSchema } from '../router/schema.js'

export const SitesSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			router: ResourceIdSchema.describe('The router id to link your site with.'),
			path: RouteSchema.describe('The path inside the router to link your site to.'),

			build: z
				.object({
					command: z
						.string()
						.describe(
							`Specifies the files and directories to generate the cache key for your custom build command.`
						),
					cacheKey: z
						.union([LocalEntrySchema.transform(v => [v]), LocalEntrySchema.array()])
						.describe(
							`Specifies the files and directories to generate the cache key for your custom build command.`
						),
					configs: z.string().array().optional().describe('Define the config values for your build command.'),
				})
				.optional()
				.describe(`Specifies the build process for sites that need a build step.`),

			static: z
				.union([LocalDirectorySchema, z.boolean()])
				.optional()
				.describe(
					"Specifies the path to the static files directory. Additionally you can also pass `true` when you don't have local static files, but still want to make an S3 bucket."
				),

			ssr: FunctionSchema.optional().describe('Specifies the file that will render the site on the server.'),
		})
	)
	.optional()
	.describe('Define the sites in your stack.')
