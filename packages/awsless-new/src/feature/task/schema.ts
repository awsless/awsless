import { z } from 'zod'
import { LocalFileSchema } from '../../config/schema/local-file.js'
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

const TaskSchema = z.union([
	LocalFileSchema.transform(file => ({
		consumer: {
			code: {
				file,
				minify: true,
				external: [],
			},
		},
		retryAttempts: undefined,
	})),
	z.object({
		consumer: FunctionSchema,
		retryAttempts: RetryAttemptsSchema.optional(),
	}),
])

export const TasksSchema = z.record(ResourceIdSchema, TaskSchema).optional().describe('Define the tasks in your stack.')
