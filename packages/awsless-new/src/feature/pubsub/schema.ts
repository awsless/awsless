import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'

const DomainSchema = ResourceIdSchema.describe('The domain id to link your Pubsub API with.')

export const PubSubDefaultSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			domain: DomainSchema.optional(),
			subDomain: z.string().optional(),

			auth: z.union([
				ResourceIdSchema,
				z.object({
					authorizer: FunctionSchema,
					// ttl: AuthorizerTtl.default('1 hour'),
				}),
			]),

			policy: z
				.object({
					publish: z.array(z.string()).optional(),
					subscribe: z.array(z.string()).optional(),
				})
				.optional(),
		})
	)
	.optional()
	.describe('Define the pubsub subscriber in your stack.')

export const PubSubSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			sql: z.string().describe('The SQL statement used to query the IOT topic.'),

			sqlVersion: z
				.enum(['2015-10-08', '2016-03-23', 'beta'])
				.default('2016-03-23')
				.describe('The version of the SQL rules engine to use when evaluating the rule.'),

			consumer: FunctionSchema.describe('The consuming lambda function properties.'),
		})
	)
	.optional()
	.describe('Define the pubsub subscriber in your stack.')
