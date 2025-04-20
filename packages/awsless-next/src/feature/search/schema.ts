import { gibibytes } from '@awsless/size'
import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { sizeMax, sizeMin, SizeSchema } from '../../config/schema/size.js'

const VersionSchema = z.enum(['2.13', '2.11', '2.9', '2.7', '2.5', '2.3', '1.3'])

const TypeSchema = z.enum([
	't3.small',
	't3.medium',
	'm3.medium',
	'm3.large',
	'm3.xlarge',
	'm3.2xlarge',
	'm4.large',
	'm4.xlarge',
	'm4.2xlarge',
	'm4.4xlarge',
	'm4.10xlarge',
	'm5.large',
	'm5.xlarge',
	'm5.2xlarge',
	'm5.4xlarge',
	'm5.12xlarge',
	'm5.24xlarge',
	'r5.large',
	'r5.xlarge',
	'r5.2xlarge',
	'r5.4xlarge',
	'r5.12xlarge',
	'r5.24xlarge',
	'c5.large',
	'c5.xlarge',
	'c5.2xlarge',
	'c5.4xlarge',
	'c5.9xlarge',
	'c5.18xlarge',
	'or1.medium',
	'or1.large',
	'or1.xlarge',
	'or1.2xlarge',
	'or1.4xlarge',
	'or1.8xlarge',
	'or1.12xlarge',
	'or1.16xlarge',
	'ultrawarm1.medium',
	'ultrawarm1.large',
	'ultrawarm1.xlarge',
	'r3.large',
	'r3.xlarge',
	'r3.2xlarge',
	'r3.4xlarge',
	'r3.8xlarge',
	'i2.xlarge',
	'i2.2xlarge',
	'i3.large',
	'i3.xlarge',
	'i3.2xlarge',
	'i3.4xlarge',
	'i3.8xlarge',
	'i3.16xlarge',
	'r6g.large',
	'r6g.xlarge',
	'r6g.2xlarge',
	'r6g.4xlarge',
	'r6g.8xlarge',
	'r6g.12xlarge',
	'm6g.large',
	'm6g.xlarge',
	'm6g.2xlarge',
	'm6g.4xlarge',
	'm6g.8xlarge',
	'm6g.12xlarge',
	'r6gd.large',
	'r6gd.xlarge',
	'r6gd.2xlarge',
	'r6gd.4xlarge',
	'r6gd.8xlarge',
	'r6gd.12xlarge',
	'r6gd.16xlarge',
])

const StorageSizeSchema = SizeSchema.refine(sizeMin(gibibytes(10)), 'Minimum storage size is 10 GB')
	.refine(sizeMax(gibibytes(100)), 'Maximum storage size is 100 GB')
	.describe("The size of the function's /tmp directory. You can specify a size value from 512 MB to 10 GiB.")

export const SearchsSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			type: TypeSchema.default('t3.small'),
			count: z.number().int().min(1).default(1),
			version: VersionSchema.default('2.13'),
			storage: StorageSizeSchema.default('10 GB'),
			// vpc: z.boolean().default(false),
		})
	)
	.optional()
	.describe('Define the search instances in your stack. Backed by OpenSearch.')
