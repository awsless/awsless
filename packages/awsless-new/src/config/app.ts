import { z } from 'zod'
import { AuthDefaultSchema } from '../feature/auth/schema.js'
import { DomainsDefaultSchema } from '../feature/domain/schema.js'
import { FunctionDefaultSchema } from '../feature/function/schema.js'
import { GraphQLDefaultSchema } from '../feature/graphql/schema.js'
import { HttpDefaultSchema } from '../feature/http/schema.js'
import { InstanceDefaultSchema } from '../feature/instance/schema.js'
import { LogSubscriptionSchema } from '../feature/log-subscription/schema.js'
import { PubSubDefaultSchema } from '../feature/pubsub/schema.js'
import { QueueDefaultSchema } from '../feature/queue/schema.js'
import { RestDefaultSchema } from '../feature/rest/schema.js'
import { RpcDefaultSchema } from '../feature/rpc/schema.js'
import { StoreDefaultSchema } from '../feature/store/schema.js'
import { TableDefaultSchema } from '../feature/table/schema.js'
import { RegionSchema } from './schema/region.js'
import { ResourceIdSchema } from './schema/resource-id.js'

export const AppSchema = z.object({
	$schema: z.string().optional(),

	name: ResourceIdSchema.describe('App name.'),
	region: RegionSchema.describe('The AWS region to deploy to.'),
	profile: z.string().describe('The AWS profile to deploy to.'),

	// stage: z
	// 	.string()
	// 	.regex(/^[a-z]+$/)
	// 	.default('prod')
	// 	.describe('The deployment stage.'),

	// onFailure: OnFailureSchema,
	logSubscription: LogSubscriptionSchema,

	defaults: z
		.object({
			auth: AuthDefaultSchema,
			domains: DomainsDefaultSchema,
			function: FunctionDefaultSchema,
			instance: InstanceDefaultSchema,
			queue: QueueDefaultSchema,
			graphql: GraphQLDefaultSchema,
			http: HttpDefaultSchema,
			rest: RestDefaultSchema,
			rpc: RpcDefaultSchema,
			pubsub: PubSubDefaultSchema,
			table: TableDefaultSchema,
			store: StoreDefaultSchema,
			// dataRetention: z.boolean().describe('Configure how your resources are handled on delete.').default(false),
		})
		.default({})
		.describe('Default properties'),
})

// export type AppConfigInput = z.input<typeof AppSchema>
export type AppConfig = z.output<typeof AppSchema>
