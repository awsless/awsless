import { z } from 'zod'
import { LocalDirectorySchema } from '../../config/schema/local-directory.js'
import { LocalEntrySchema } from '../../config/schema/local-entry.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { ConfigNameSchema } from '../config/schema.js'
import { StackFunctionSchema } from '../function/schema.js'
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
					configs: ConfigNameSchema.array()
						.optional()
						.describe('Define the config values for your build command.'),
				})
				.optional()
				.describe(`Specifies the build process for sites that need a build step.`),

			static: LocalDirectorySchema.optional().describe('Specifies the path to the static files directory.'),

			ssr: StackFunctionSchema.optional().describe('Specifies the file that will render the site on the server.'),

			dev: z
				.object({
					command: z
						.string()
						.describe(
							'The command that starts your own dev server, with every "$PORT" replaced by the assigned port. The command also receives the port as the PORT environment variable.'
						),
					port: z
						.number()
						.int()
						.positive()
						.optional()
						.describe(
							'The fixed port your dev server listens on. Leave out to assign a free port automatically.'
						),
				})
				.optional()
				.describe(
					'Serve the site through your own dev server (like vite) during "awsless dev". The local router proxies the site routes to it, so your frontend & api share one origin. Deployments ignore this option.'
				),
		})
	)
	.optional()
	.describe('Define the sites in your stack.')
