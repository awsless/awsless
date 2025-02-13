import { z } from 'zod'
import { ArchitectureSchema, NodeRuntimeSchema } from '../../config/schema/lambda.js'
import { LocalFileSchema } from '../../config/schema/local-file.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'

const Schema = z.object({
	file: LocalFileSchema,
	description: z.string().optional().describe('A description of the lambda layer.'),
	runtimes: NodeRuntimeSchema.array().optional(),
	architectures: ArchitectureSchema.array().optional(),
	packages: z
		.string()
		.array()
		.optional()
		.describe(
			'Define the package names that are available bundled in the layer. Those packages are not bundled while bundling the lambda.'
		),
})

export type LayerProps = z.output<typeof Schema>

export const LayerSchema = z
	.record(
		ResourceIdSchema,
		z.union([
			LocalFileSchema.transform(file => ({
				file,
			})),
			Schema,
		])
	)
	.optional()
	.describe('Define the lambda layers in your stack.')
