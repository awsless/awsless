import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'
import { HttpRequestMethod } from '../../formation/resource/elb/listener-rule.js'

export type Route = `${HttpRequestMethod} /${string}`

export const RouteSchema = z
	.string()
	.regex(/^(POST|GET|PUT|DELETE|HEAD|OPTIONS)(\s\/[a-z0-9\+\_\-\/\{\}]*)$/gi, 'Invalid route')
	.transform<Route>(v => v as Route)

export const HttpDefaultSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			domain: ResourceIdSchema.describe('The domain id to link your API with.'),
			subDomain: z.string().optional(),
			auth: ResourceIdSchema.optional(),
		})
	)
	.optional()
	.describe("Define your global HTTP API's.")

export const HttpSchema = z
	.record(ResourceIdSchema, z.record(RouteSchema, FunctionSchema))
	.optional()
	.describe('Define routes in your stack for your global HTTP API.')
