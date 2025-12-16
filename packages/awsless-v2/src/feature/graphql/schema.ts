import { z } from 'zod'
import { FunctionSchema } from '../function/schema.js'
import { LocalFileSchema } from '../../config/schema/local-file.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { DurationSchema } from '../../config/schema/duration.js'

const AuthorizerTtl = DurationSchema.describe(
	`The number of seconds a response should be cached for. The maximum value is one hour (3600 seconds). The Lambda function can override this by returning a ttlOverride key in its response.`
)

export const GraphQLDefaultSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			domain: ResourceIdSchema.describe('The domain id to link your API with.').optional(),
			subDomain: z.string().optional(),
			auth: z
				.union([
					ResourceIdSchema,
					z.object({
						authorizer: FunctionSchema,
						ttl: AuthorizerTtl.default('1 hour'),
					}),
				])
				.optional(),
			// authorization: z.object({
			// 	authorizer: FunctionSchema,
			// 	ttl: DurationSchema.default('1 hour'),
			// }).optional(),
			resolver: LocalFileSchema.optional(),
		})
	)
	.describe(`Define the global GraphQL API's.`)
	.optional()

export const GraphQLSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			// schema: z.union([LocalFileSchema.transform(v => [v]), z.array(LocalFileSchema).min(1)]).optional(),
			schema: LocalFileSchema.describe('The graphql schema file.'),
			resolvers: z
				.record(
					// TypeName
					z.string(),
					z.record(
						// FieldName
						z.string(),
						z.union([
							FunctionSchema.transform(consumer => ({
								consumer,
							})),
							z.object({
								consumer: FunctionSchema,
								resolver: LocalFileSchema.optional(),
							}),
						])
					)
				)
				.describe('The resolvers for your global GraphQL API.')
				.optional(),
		})
	)
	.describe('Define the schema & resolvers in your stack for your global GraphQL API.')
	.optional()
