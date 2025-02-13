import { z } from 'zod'
import { ArchitectureSchema, NodeRuntimeSchema } from '../../config/schema/lambda.js'
import { LocalFileSchema } from '../../config/schema/local-file.js'

const Schema = z.object({
	file: LocalFileSchema,
	runtimes: NodeRuntimeSchema.array().optional(),
	architecture: ArchitectureSchema.optional(),
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
		z.string(),
		z.union([
			LocalFileSchema.transform(file => ({
				file,
				description: undefined,
			})),
			Schema,
		])
	)
	.optional()
	.describe('Define the lambda layers in your stack.')
