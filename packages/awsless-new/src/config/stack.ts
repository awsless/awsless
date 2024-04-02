import { z } from 'zod'
import { ResourceIdSchema } from './schema/resource-id.js'
// import { CronsSchema } from '../feature/cron/schema/index.js'
// import { SubscribersSchema, TopicsSchema } from '../feature/topic/schema.js'
import { OnFailureSchema } from '../feature/on-failure/schema.js'
// import { AuthSchema } from '../feature/auth/schema.js'
// import { CachesSchema } from '../feature/cache/schema.js'
// import { ConfigsSchema } from '../feature/config/schema.js'
import { FunctionsSchema } from '../feature/function/schema.js'
// import { GraphQLSchema } from '../feature/graphql/schema.js'
import { TablesSchema } from '../feature/table/schema.js'
// import { HttpSchema } from '../feature/http/schema.js'
// import { StoresSchema } from '../feature/store/schema.js'
import { QueuesSchema } from '../feature/queue/schema.js'
// import { PubSubSchema } from '../feature/pubsub/schema.js'
// import { SearchsSchema } from '../feature/search/schema.js'
// import { RestSchema } from '../feature/rest/schema.js'
// import { SitesSchema } from '../feature/site/schema.js'
import { TestsSchema } from '../feature/test/schema.js'

const DependsSchema = ResourceIdSchema.array()
	.optional()
	.describe('Define the stacks that this stack is depended on.')

export const StackSchema = z.object({
	$schema: z.string().optional(),
	name: ResourceIdSchema,
	depends: DependsSchema,
	onFailure: OnFailureSchema,
	// auth: AuthSchema,
	// graphql: GraphQLSchema,
	// http: HttpSchema,
	// rest: RestSchema,
	// configs: ConfigsSchema,
	// crons: CronsSchema,
	// caches: CachesSchema,
	// topics: TopicsSchema,
	// subscribers: SubscribersSchema,
	functions: FunctionsSchema,
	tables: TablesSchema,
	// stores: StoresSchema,
	queues: QueuesSchema,
	// pubsub: PubSubSchema,
	// searchs: SearchsSchema,
	// sites: SitesSchema,
	tests: TestsSchema,
})

// export type StackConfigInput = z.input<typeof StackSchema>
export type StackConfig = z.output<typeof StackSchema> & { file: string }
