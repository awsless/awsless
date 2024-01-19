import { z } from 'zod'
import { FunctionSchema } from '../function/schema.js'
import { LocalFileSchema } from '../../config/schema/local-file.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'

export const GraphQLDefaultSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			domain: z.string().optional(),
			subDomain: z.string().optional(),
			auth: ResourceIdSchema.optional(),
			// authorization: z.object({
			// 	authorizer: FunctionSchema,
			// 	ttl: DurationSchema.default('1 hour'),
			// }).optional(),
			resolver: LocalFileSchema.optional(),
		})
	)
	.optional()

export const GraphQLSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			schema: z.union([LocalFileSchema, z.array(LocalFileSchema).min(1)]).optional(),
			resolvers: z
				.record(
					// TypeName
					z.string(),
					z.record(
						// FieldName
						z.string(),
						z.union([
							FunctionSchema,
							z.object({
								consumer: FunctionSchema,
								resolver: LocalFileSchema.optional(),
							}),
						])
					)
				)
				.optional(),
		})
	)
	.optional()
