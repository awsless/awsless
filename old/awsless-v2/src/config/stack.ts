import { z } from 'zod'
import { AuthSchema } from '../feature/auth/schema.js'
import { CachesSchema } from '../feature/cache/schema.js'
import { CommandsSchema } from '../feature/command/schema.js'
import { ConfigsSchema } from '../feature/config/schema.js'
import { CronsSchema } from '../feature/cron/schema/index.js'
import { FunctionsSchema } from '../feature/function/schema.js'
import { GraphQLSchema } from '../feature/graphql/schema.js'
import { HttpSchema } from '../feature/http/schema.js'
import { InstancesSchema } from '../feature/instance/schema.js'
// import { OnFailureSchema } from '../feature/on-failure/schema.js'
import { PubSubSchema } from '../feature/pubsub/schema.js'
import { QueuesSchema } from '../feature/queue/schema.js'
import { RestSchema } from '../feature/rest/schema.js'
import { RpcSchema } from '../feature/rpc/schema.js'
import { SearchsSchema } from '../feature/search/schema.js'
import { SitesSchema } from '../feature/site/schema.js'
import { StoresSchema } from '../feature/store/schema.js'
import { StreamsSchema } from '../feature/stream/schema.js'
import { TablesSchema } from '../feature/table/schema.js'
import { TasksSchema } from '../feature/task/schema.js'
import { TestsSchema } from '../feature/test/schema.js'
import { SubscribersSchema, TopicsSchema } from '../feature/topic/schema.js'
import { ResourceIdSchema } from './schema/resource-id.js'

const DependsSchema = ResourceIdSchema.array().optional().describe('Define the stacks that this stack is depended on.')

const NameSchema = ResourceIdSchema.refine(name => !['base', 'hostedzones'].includes(name), {
	message: `Stack name can't be a reserved name.`,
}).describe('Stack name.')

export const StackSchema = z.object({
	$schema: z.string().optional(),
	name: NameSchema,
	depends: DependsSchema,

	commands: CommandsSchema,

	// onFailure: OnFailureSchema,
	auth: AuthSchema,
	graphql: GraphQLSchema,
	http: HttpSchema,
	rest: RestSchema,
	rpc: RpcSchema,
	configs: ConfigsSchema,
	crons: CronsSchema,
	caches: CachesSchema,
	topics: TopicsSchema,
	subscribers: SubscribersSchema,
	functions: FunctionsSchema,
	instances: InstancesSchema,
	tasks: TasksSchema,
	tables: TablesSchema,
	stores: StoresSchema,
	streams: StreamsSchema,
	queues: QueuesSchema,
	pubsub: PubSubSchema,
	searchs: SearchsSchema,
	sites: SitesSchema,
	tests: TestsSchema,
})

// export type StackConfigInput = z.input<typeof StackSchema>
export type StackConfig = z.output<typeof StackSchema> & { file: string }
