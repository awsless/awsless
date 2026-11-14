import { z } from 'zod'
import { AlertsDefaultSchema } from '../feature/alert/schema.js'
import { AuthDefaultSchema } from '../feature/auth/schema.js'
import { ClickHouseDefaultSchema } from '../feature/clickhouse/schema.js'
import { ConfigsSchema } from '../feature/config/schema.js'
import { DomainsDefaultSchema } from '../feature/domain/schema.js'
import { FunctionDefaultSchema } from '../feature/function/schema.js'
import { InstanceDefaultSchema } from '../feature/instance/schema.js'
import { JobDefaultSchema } from '../feature/job/schema.js'
import { LayerSchema } from '../feature/layer/schema.js'
import { OnErrorLogDefaultSchema } from '../feature/on-error-log/schema.js'
import { OnFailureDefaultSchema } from '../feature/on-failure/schema.js'
import { PostgresDefaultSchema } from '../feature/postgres/schema.js'
import { PubSubDefaultSchema } from '../feature/pubsub/schema.js'
import { QueueDefaultSchema } from '../feature/queue/schema.js'
import { RestDefaultSchema } from '../feature/rest/schema.js'
import { RouterDefaultSchema } from '../feature/router/schema.js'
import { RpcDefaultSchema } from '../feature/rpc/schema.js'
import { SearchDefaultSchema } from '../feature/search/schema.js'
import { TestDefaultSchema } from '../feature/test/schema.js'
import { TopicsDefaultSchema } from '../feature/topic/schema.js'
import { LocalEntrySchema } from './schema/local-entry.js'
import { RegionSchema } from './schema/region.js'
import { ResourceIdSchema } from './schema/resource-id.js'

export const AppSchema = z
	.object({
		$schema: z.string().optional(),

		name: ResourceIdSchema.describe('App name.'),
		region: RegionSchema.describe('The AWS region to deploy to.'),
		profile: z.string().describe('The AWS profile to deploy to.'),

		protect: z.boolean().default(false).describe('Protect your app & stacks from being deleted.'),

		tracing: z
			.union([
				z.boolean(),
				z.object({
					sampleRate: z
						.number()
						.min(0)
						.max(1)
						.describe(
							'The share of the requests through a router to trace, like 0.005 for 0.5%. Without it Lambda samples the first request each second and 5% of the rest, which it still does for what no router calls: crons, table streams and scheduled tasks.'
						),
				}),
			])
			.default(false)
			.describe(
				[
					'Turns on AWS X-Ray tracing for the app: a span per route, AWS SDK call, ClickHouse query, Redis command, OpenSearch request and fetch, and the trace carried through invokes, queues and topics, which record their own segment per delivery.',
					'`true` leaves the sampling to Lambda; `{ sampleRate }` sets the share of router requests to trace. X-Ray bills per trace recorded.',
				].join('\n')
			),

		configs: ConfigsSchema,
		seed: LocalEntrySchema.optional().describe(
			'The file that seeds your local dev environment with data. It runs with the full local environment on the first dev boot & through the dashboard reseed button. One app wide file, so the seeding order is explicit.'
		),
		removal: z
			.enum(['remove', 'retain'])
			.default('remove')
			.describe(
				[
					'Configure how your resources are handled when they have to be removed.',
					'',
					'remove: Removes all underlying resources.',
					'retain: Retains the following resources: stores, tables, auth, searchs, clickhouse, and caches.',
				].join('\n')
			),

		onFailure: OnFailureDefaultSchema,
		onErrorLog: OnErrorLogDefaultSchema,
		auth: AuthDefaultSchema,
		domains: DomainsDefaultSchema,
		function: FunctionDefaultSchema,
		instance: InstanceDefaultSchema,
		job: JobDefaultSchema,
		queue: QueueDefaultSchema,
		rest: RestDefaultSchema,
		rpc: RpcDefaultSchema,
		pubsub: PubSubDefaultSchema,
		alerts: AlertsDefaultSchema,
		topics: TopicsDefaultSchema,
		layers: LayerSchema,
		router: RouterDefaultSchema,
		search: SearchDefaultSchema,
		clickhouse: ClickHouseDefaultSchema,
		postgres: PostgresDefaultSchema,
		test: TestDefaultSchema,
	})
	.strict()

export type AppConfig = z.output<typeof AppSchema> & { stage?: string }
