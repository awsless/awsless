import { z } from 'zod'
import { DurationSchema } from '../../config/schema/duration.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'

const AuthorizerTtl = DurationSchema.describe(
	`The number of seconds a response should be cached for. The maximum value is one hour (3600 seconds). The Lambda function can override this by returning a ttlOverride key in its response.`
)

export const TRPCDefaultSchema = z
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
		})
	)
	.describe(`Define the global GraphQL API's.`)
	.optional()

export const TRPCSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			query: z
				.record(
					// FunctionName
					z.string(),
					FunctionSchema
				)
				.describe('The queries for your global TRPC API.')
				.optional(),
			mutate: z
				.record(
					// FunctionName
					z.string(),
					FunctionSchema
				)
				.describe('The queries for your global TRPC API.')
				.optional(),
		})
	)
	.describe('Define the schema in your stack for your global TRPC API.')
	.optional()
