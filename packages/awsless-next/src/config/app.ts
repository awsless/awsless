import { z } from 'zod'
// import { InstanceDefaultSchema } from '../feature/__instance/schema.js'
import { AlertsDefaultSchema } from '../feature/alert/schema.js'
import { AuthDefaultSchema } from '../feature/auth/schema.js'
import { DomainsDefaultSchema } from '../feature/domain/schema.js'
// import { FunctionDefaultSchema } from ../feature/__graphql/schema.jsjs'
// import { GraphQLDefaultSchema } from '../feature/graphql/schema.js'
// import { HttpDefaultSchema } from '../feature/__http/schema.js'
import { FunctionDefaultSchema } from '../feature/function/schema.js'
import { LayerSchema } from '../feature/layer/schema.js'
import { OnFailureDefaultSchema } from '../feature/on-failure/schema.js'
import { OnLogDefaultSchema } from '../feature/on-log/schema.js'
import { PubSubDefaultSchema } from '../feature/pubsub/schema.js'
import { QueueDefaultSchema } from '../feature/queue/schema.js'
import { RestDefaultSchema } from '../feature/rest/schema.js'
import { RpcDefaultSchema } from '../feature/rpc/schema.js'
// import { StoreDefaultSchema } from '../feature/store/schema.js'
// import { TableDefaultSchema } from '../feature/table/schema.js'
import { RegionSchema } from './schema/region.js'
import { ResourceIdSchema } from './schema/resource-id.js'

export const AppSchema = z.object({
	$schema: z.string().optional(),

	name: ResourceIdSchema.describe('App name.'),
	region: RegionSchema.describe('The AWS region to deploy to.'),
	profile: z.string().describe('The AWS profile to deploy to.'),

	protect: z.boolean().default(false).describe('Protect your app & stacks from being deleted.'),
	removal: z
		.enum(['remove', 'retain'])
		.default('remove')
		.describe(
			[
				'Configure how your resources are handled when they have to be removed.',
				'',
				'remove: Removes the underlying resource.',
				'retain: Retains resources like S3 stores and DynamoDB tables. Removes everything else.',
			].join('\n')
		),

	// stage: z
	// 	.string()
	// 	.regex(/^[a-z]+$/)
	// 	.default('prod')
	// 	.describe('The deployment stage.'),

	// onFailure: OnFailureSchema,

	defaults: z
		.object({
			onFailure: OnFailureDefaultSchema,
			onLog: OnLogDefaultSchema,

			auth: AuthDefaultSchema,
			domains: DomainsDefaultSchema,
			function: FunctionDefaultSchema,
			// instance: InstanceDefaultSchema,
			queue: QueueDefaultSchema,
			// graphql: GraphQLDefaultSchema,
			// http: HttpDefaultSchema,
			rest: RestDefaultSchema,
			rpc: RpcDefaultSchema,
			pubsub: PubSubDefaultSchema,
			// table: TableDefaultSchema,
			// store: StoreDefaultSchema,
			alerts: AlertsDefaultSchema,
			layers: LayerSchema,
			// dataRetention: z.boolean().describe('Configure how your resources are handled on delete.').default(false),
		})
		.default({})
		.describe('Default properties'),
})

// export type AppConfigInput = z.input<typeof AppSchema>
export type AppConfig = z.output<typeof AppSchema>
