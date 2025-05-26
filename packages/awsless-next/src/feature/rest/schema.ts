import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { RouteSchema } from '../../config/schema/route.js'
import { FunctionSchema } from '../function/schema.js'

export const RestDefaultSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			domain: ResourceIdSchema.describe('The domain id to link your API with.').optional(),
			subDomain: z.string().optional(),
		})
	)
	.optional()
	.describe("Define your global REST API's.")

export const RestSchema = z
	.record(
		ResourceIdSchema,
		z.record(
			RouteSchema.describe(
				[
					'The REST API route that is comprised by the http method and http path.',
					'The possible http methods are POST, GET,PUT, DELETE, HEAD, OPTIONS, ANY.',
					'Example: GET /posts/{id}',
				].join('\n')
			),
			FunctionSchema
		)
	)
	.optional()
	.describe('Define routes in your stack for your global REST API.')
