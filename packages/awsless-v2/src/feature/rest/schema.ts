import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'
import { RouteSchema } from '../../config/schema/route.js'

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
	.record(ResourceIdSchema, z.record(RouteSchema, FunctionSchema))
	.optional()
	.describe('Define routes in your stack for your global REST API.')
