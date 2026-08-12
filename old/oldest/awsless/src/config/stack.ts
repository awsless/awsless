import { z } from 'zod'
import { ResourceIdSchema } from './schema/resource-id.js'
import { CronsSchema } from '../plugins/cron/schema/index.js'
import { SubscribersSchema, TopicsSchema } from '../plugins/topic/schema.js'
import { OnFailureSchema } from '../plugins/on-failure/schema.js'
import { AuthSchema } from '../plugins/auth/schema.js'
import { CachesSchema } from '../plugins/cache/schema.js'
import { ConfigsSchema } from '../plugins/config/schema.js'
import { FunctionsSchema } from '../plugins/function/schema.js'
import { GraphQLSchema } from '../plugins/graphql/schema.js'
import { TablesSchema } from '../plugins/table/schema.js'
import { HttpSchema } from '../plugins/http/schema.js'
import { StoresSchema } from '../plugins/store/schema.js'
import { QueuesSchema } from '../plugins/queue/schema.js'
import { PubSubSchema } from '../plugins/pubsub/schema.js'
import { SearchsSchema } from '../plugins/search/schema.js'
import { RestSchema } from '../plugins/rest/schema.js'
import { SitesSchema } from '../plugins/site/schema.js'
import { TestsSchema } from '../plugins/test/schema.js'

const DependsSchema = ResourceIdSchema.array()
	.optional()
	.describe('Define the stacks that this stack is depended on.')

export const StackSchema = z.object({
	$schema: z.string().optional(),
	name: ResourceIdSchema,
	depends: DependsSchema,
	onFailure: OnFailureSchema,
	auth: AuthSchema,
	graphql: GraphQLSchema,
	http: HttpSchema,
	rest: RestSchema,
	configs: ConfigsSchema,
	crons: CronsSchema,
	caches: CachesSchema,
	topics: TopicsSchema,
	subscribers: SubscribersSchema,
	functions: FunctionsSchema,
	tables: TablesSchema,
	stores: StoresSchema,
	queues: QueuesSchema,
	pubsub: PubSubSchema,
	searchs: SearchsSchema,
	sites: SitesSchema,
	tests: TestsSchema,
})

// export type StackConfigInput = z.input<typeof StackSchema>
export type StackConfig = z.output<typeof StackSchema> & { file: string }
