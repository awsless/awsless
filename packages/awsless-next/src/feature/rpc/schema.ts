import { z } from 'zod'
// import { DurationSchema } from '../../config/schema/duration.js'
import { minutes, seconds } from '@awsless/duration'
import { durationMax, durationMin, DurationSchema } from '../../config/schema/duration.js'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema, LogSchema } from '../function/schema.js'

// const AuthorizerTtl = DurationSchema.describe(
// 	`The duration a response should be cached for. The maximum value is one hour. The Lambda function can override this by returning a ttl key in its response.`
// )

const TimeoutSchema = DurationSchema.refine(durationMin(seconds(10)), 'Minimum timeout duration is 10 seconds')
	.refine(durationMax(minutes(5)), 'Maximum timeout duration is 5 minutes')
	.describe(
		[
			'The amount of time that the RPC lambda is allowed run before stopping it.',
			'You can specify a size value from 1 second to 5 minutes.',
			'The timeouts of all inner RPC functions will be capped at 80% of this timeout.',
		].join(' ')
	)

export const RpcDefaultSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			domain: ResourceIdSchema.describe('The domain id to link your RPC API with.').optional(),
			subDomain: z.string().optional(),
			auth: FunctionSchema.optional(),
			log: LogSchema.optional(),
			timeout: TimeoutSchema.default('1 minutes'),

			geoRestrictions: z
				.array(z.string().length(2).toUpperCase())
				.default([])
				.describe('Specifies a blacklist of countries that should be blocked.'),
		})
	)
	.describe(`Define the global RPC API's.`)
	.optional()

export const RpcSchema = z
	.record(ResourceIdSchema, z.record(z.string(), FunctionSchema).describe('The queries for your global RPC API.'))
	.describe('Define the schema in your stack for your global RPC API.')
	.optional()
