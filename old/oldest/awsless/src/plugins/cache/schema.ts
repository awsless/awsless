import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'

const TypeSchema = z.enum([
	't4g.small',
	't4g.medium',

	'r6g.large',
	'r6g.xlarge',
	'r6g.2xlarge',
	'r6g.4xlarge',
	'r6g.8xlarge',
	'r6g.12xlarge',
	'r6g.16xlarge',

	'r6gd.xlarge',
	'r6gd.2xlarge',
	'r6gd.4xlarge',
	'r6gd.8xlarge',
])

const PortSchema = z.number().int().min(1).max(50000)
const ShardsSchema = z.number().int().min(0).max(100)
const ReplicasPerShardSchema = z.number().int().min(0).max(5)
const EngineSchema = z.enum(['7.0', '6.2'])

export const CachesSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			type: TypeSchema.default('t4g.small'),
			port: PortSchema.default(6379),
			shards: ShardsSchema.default(1),
			replicasPerShard: ReplicasPerShardSchema.default(1),
			engine: EngineSchema.default('7.0'),
			dataTiering: z.boolean().default(false),
		})
	)
	.optional()
	.describe('Define the caches in your stack. For access to the cache put your functions inside the global VPC.')
