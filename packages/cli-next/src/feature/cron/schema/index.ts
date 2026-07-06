import { z } from 'zod'
import { ResourceIdSchema } from '../../../config/schema/resource-id.js'
import { FunctionSchema } from '../../function/schema.js'
import { ScheduleExpressionSchema } from './schedule.js'

const RetryAttemptsSchema = z
	.number()
	.int()
	.min(0)
	.max(2)
	.describe(
		'The maximum number of times to retry when the function returns an error. You can specify a number from 0 to 2.'
	)

export const CronsSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			enabled: z.boolean().default(true).describe('If the cron is enabled.'),
			consumer: FunctionSchema.describe('The consuming lambda function properties.'),
			schedule: ScheduleExpressionSchema.describe(
				'The scheduling expression.\n\nexample: "0 20 * * ? *"\nexample: "5 minutes"'
			),
			payload: z.unknown().optional().describe('The JSON payload that will be passed to the consumer.'),
			retryAttempts: RetryAttemptsSchema.default(2),
		})
	)
	.optional()
	.describe(`Define the cron jobs in your stack.`)
