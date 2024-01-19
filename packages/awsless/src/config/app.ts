import { z } from 'zod'
import { ResourceIdSchema } from './schema/resource-id.js'
import { RegionSchema } from './schema/region.js'
import { AuthDefaultSchema } from '../plugins/auth/schema.js'
import { DomainsDefaultSchema } from '../plugins/domain/schema.js'
import { FunctionDefaultSchema } from '../plugins/function/schema.js'
import { GraphQLDefaultSchema } from '../plugins/graphql/schema.js'
import { HttpDefaultSchema } from '../plugins/http/schema.js'
import { QueueDefaultSchema } from '../plugins/queue/schema.js'
import { RestDefaultSchema } from '../plugins/rest/schema.js'

export const AppSchema = z.object({
	$schema: z.string(),
	name: ResourceIdSchema.describe('App name.'),
	region: RegionSchema.describe('The AWS region to deploy to.'),
	profile: z.string().describe('The AWS profile to deploy to.'),
	stage: z
		.string()
		.regex(/^[a-z]+$/)
		.default('prod')
		.describe('The deployment stage.'),

	defaults: z
		.object({
			auth: AuthDefaultSchema,
			domains: DomainsDefaultSchema,
			function: FunctionDefaultSchema,
			queue: QueueDefaultSchema,
			graphql: GraphQLDefaultSchema,
			http: HttpDefaultSchema,
			rest: RestDefaultSchema,
		})
		.default({})
		.describe('Default properties'),
})

// export type AppConfigInput = z.input<typeof AppSchema>
export type AppConfig = z.output<typeof AppSchema>
