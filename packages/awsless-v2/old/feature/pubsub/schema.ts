import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'

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
