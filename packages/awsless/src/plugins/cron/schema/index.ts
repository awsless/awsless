import { z } from 'zod'
import { ResourceIdSchema } from '../../../config/schema/resource-id.js'
import { FunctionSchema } from '../../function/schema.js'
import { ScheduleExpressionSchema } from './schedule.js'

export const CronsSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			consumer: FunctionSchema.describe('The consuming lambda function properties.'),
			schedule: ScheduleExpressionSchema.describe(
				'The scheduling expression.\n\nexample: "0 20 * * ? *"\nexample: "5 minutes"'
			),
			payload: z.unknown().optional().describe('The JSON payload that will be passed to the consumer.'),
		})
	)
	.optional()
