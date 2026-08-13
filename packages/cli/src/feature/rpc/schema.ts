import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { BundledFunctionSchema } from '../function/schema.js'
import { RouteSchema } from '../router/schema.js'

export const RpcDefaultSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			router: ResourceIdSchema.describe('The router id to link your RPC API with.'),
			path: RouteSchema.describe('The path inside the router to link your RPC API to.'),

			auth: BundledFunctionSchema.optional().describe('The authentication handler for your RPC API.'),
		})
	)
	.describe(`Define the global RPC API's.`)
	.optional()

export const RpcSchema = z
	.record(
		ResourceIdSchema,
		z
			.record(
				z.string(),
				z.union([
					BundledFunctionSchema.transform(f => ({
						function: f,
						lock: false,
					})),
					z.object({
						function: BundledFunctionSchema.describe('The RPC function to execute.'),
						lock: z
							.boolean()
							.describe(
								[
									'Specify if the function should be locked on the `lockKey` returned from the auth function.',
									'An example would be returning the user ID as `lockKey`.',
								].join('\n')
							),
					}),
				])
			)
			.describe('The queries for your global RPC API.')
	)
	.describe('Define the schema in your stack for your global RPC API.')
	.optional()
