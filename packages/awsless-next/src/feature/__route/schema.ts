import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'

export const RouteDefaultSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			domain: ResourceIdSchema.describe('The domain id to link your Route API.').optional(),
			subDomain: z.string().optional(),

			geoRestrictions: z
				.array(z.string().length(2).toUpperCase())
				.default([])
				.describe('Specifies a blacklist of countries that should be blocked.'),
		})
	)
	.describe(`Define the global Route API's.`)
	.optional()

export const RouteSchema = z
	.record(ResourceIdSchema, z.record(z.string(), FunctionSchema).describe('The routes for your global Route API.'))
	.describe('Define the routes in your stack for your global Route API.')
	.optional()
