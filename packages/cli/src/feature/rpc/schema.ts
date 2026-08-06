// import { minutes, seconds } from '@awsless/duration'
import { z } from 'zod'
// import { durationMax, durationMin, DurationSchema } from '../../config/schema/duration.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { BundledFunctionSchema } from '../function/schema.js'
import { RouteSchema } from '../router/schema.js'

// const AuthorizerTtl = DurationSchema.describe(
// 	`The duration a response should be cached for. The maximum value is one hour. The Lambda function can override this by returning a ttl key in its response.`
// )

// The rpc timeout is defined by the shared bundle.
// const TimeoutSchema = DurationSchema
// 	.refine(durationMin(seconds(10)), 'Minimum timeout duration is 10 seconds')
// 	.refine(durationMax(minutes(2)), 'Maximum timeout duration is 2 minutes')
// 	.describe('The amount of time that the RPC lambda is allowed run before stopping it.')

export const RpcDefaultSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			// domain: ResourceIdSchema.describe('The domain id to link your RPC API with.').optional(),
			// subDomain: z.string().optional(),
			//
			router: ResourceIdSchema.describe('The router id to link your RPC API with.'),
			path: RouteSchema.describe('The path inside the router to link your RPC API to.'),

			auth: BundledFunctionSchema.optional().describe('The authentication handler for your RPC API.'),
			// timeout: TimeoutSchema.default('1 minutes'),
		})
	)
	.describe(`Define the global RPC API's.`)
	.optional()

// const PermissionsSchema = z
// 	.union([
// 		//
// 		z.string().transform(v => [v]),
// 		z.string().array(),
// 	])
// 	.default([])
// 	.describe(
// 		'Specifies a list of permissions that can be used inside your custom authorizer function to determine if the user has access to this specific RPC function.'
// 	)

// const EntrySchema = z.union([
// 	BundledFunctionSchema.transform(props => ({
// 		function: props,
// 		permissions: [],
// 	})),
// 	z.object({
// 		function: BundledFunctionSchema,
// 		permissions: PermissionsSchema,
// 	}),
// ])

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
