import { z } from 'zod'
import { CachesSchema } from '../feature/cache/schema.js'
import { CommandsSchema } from '../feature/command/schema.js'
import { CronsSchema } from '../feature/cron/schema/index.js'
import { FunctionsSchema } from '../feature/function/schema.js'
import { IconsSchema } from '../feature/icon/schema.js'
import { ImagesSchema } from '../feature/image/schema.js'
import { InstancesSchema } from '../feature/instance/schema.js'
import { JobsSchema } from '../feature/job/schema.js'
import { MetricsSchema } from '../feature/metric/schema.js'
import { PubSubSchema } from '../feature/pubsub/schema.js'
import { QueuesSchema } from '../feature/queue/schema.js'
import { RestSchema } from '../feature/rest/schema.js'
import { RoutesSchema } from '../feature/router/schema.js'
import { RpcSchema } from '../feature/rpc/schema.js'
import { SearchsSchema } from '../feature/search/schema.js'
import { SitesSchema } from '../feature/site/schema.js'
import { StoresSchema } from '../feature/store/schema.js'
import { TablesSchema } from '../feature/table/schema.js'
import { TasksSchema } from '../feature/task/schema.js'
import { TestsSchema } from '../feature/test/schema.js'
import { SubscribersSchema } from '../feature/topic/schema.js'
import { ResourceIdSchema } from './schema/resource-id.js'

const NameSchema = ResourceIdSchema.refine(name => !['base', 'hostedzones'].includes(name), {
	message: `Stack name can't be a reserved name.`,
}).describe('Stack name.')

export const StackSchema = z
	.object({
		$schema: z.string().optional(),
		name: NameSchema,
		routes: RoutesSchema,

		commands: CommandsSchema,
		rest: RestSchema,
		rpc: RpcSchema,
		crons: CronsSchema,
		caches: CachesSchema,
		subscribers: SubscribersSchema,
		functions: FunctionsSchema,
		instances: InstancesSchema,
		jobs: JobsSchema,
		tasks: TasksSchema,
		tables: TablesSchema,
		stores: StoresSchema,
		queues: QueuesSchema,
		pubsub: PubSubSchema,
		searchs: SearchsSchema,
		sites: SitesSchema,
		tests: TestsSchema,
		images: ImagesSchema,
		icons: IconsSchema,
		metrics: MetricsSchema,
	})
	.strict()

export type StackConfig = z.output<typeof StackSchema> & { file: string }
