import { gibibytes } from '@awsless/size'
import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { sizeMax, sizeMin, SizeSchema } from '../../config/schema/size.js'

const StorageSchema = SizeSchema.refine(sizeMin(gibibytes(1)), 'Minimum storage size is 1 GB').refine(
	sizeMax(gibibytes(5000)),
	'Maximum storage size is 5000 GB'
)

const MinimumStorageSchema = StorageSchema.describe(
	'The lower limit for data storage the cache is set to use. You can specify a size value from 1 GB to 5000 GB.'
)
const MaximumStorageSchema = StorageSchema.describe(
	'The upper limit for data storage the cache is set to use. You can specify a size value from 1 GB to 5000 GB.'
)

const EcpuSchema = z.number().int().min(1000).max(15_000_000)
const MinimumEcpuSchema = EcpuSchema.describe(
	'The minimum number of ECPUs the cache can consume per second. You can specify a integer from 1,000 to 15,000,000.'
)
const MaximumEcpuSchema = EcpuSchema.describe(
	'The maximum number of ECPUs the cache can consume per second. You can specify a integer from 1,000 to 15,000,000.'
)

export const CachesSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			minStorage: MinimumStorageSchema.optional(),
			maxStorage: MaximumStorageSchema.optional(),
			minECPU: MinimumEcpuSchema.optional(),
			maxECPU: MaximumEcpuSchema.optional(),

			snapshotRetentionLimit: z.number().int().positive().default(1),
		})
	)
	.optional()
	.describe('Define the caches in your stack. For access to the cache put your functions inside the global VPC.')
