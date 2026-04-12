import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'

const RetryAttemptsSchema = z
	.number()
	.int()
	.min(0)
	.max(2)
	.describe(
		'The maximum number of times to retry when the function returns an error. You can specify a number from 0 to 2.'
	)

export const TaskSchema = z.union([
	FunctionSchema.transform(consumer => ({
		consumer,
		retryAttempts: 2,
	})),
	z.object({
		consumer: FunctionSchema,
		retryAttempts: RetryAttemptsSchema.default(2),
	}),
])

export const TasksSchema = z.record(ResourceIdSchema, TaskSchema).optional().describe('Define the tasks in your stack.')
