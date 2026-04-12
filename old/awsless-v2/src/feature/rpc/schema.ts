import { z } from 'zod'
// import { DurationSchema } from '../../config/schema/duration.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema, LogSchema } from '../function/schema.js'

// const AuthorizerTtl = DurationSchema.describe(
// 	`The duration a response should be cached for. The maximum value is one hour. The Lambda function can override this by returning a ttl key in its response.`
// )

export const RpcDefaultSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			domain: ResourceIdSchema.describe('The domain id to link your RPC API with.').optional(),
			subDomain: z.string().optional(),
			auth: FunctionSchema.optional(),
			log: LogSchema.optional(),
		})
	)
	.describe(`Define the global RPC API's.`)
	.optional()

export const RpcSchema = z
	.record(ResourceIdSchema, z.record(z.string(), FunctionSchema).describe('The queries for your global RPC API.'))
	.describe('Define the schema in your stack for your global RPC API.')
	.optional()
