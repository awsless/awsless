import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'

export const TaskSchema = z.union([
	FunctionSchema.transform(consumer => ({
		consumer,
	})),
	z.object({
		consumer: FunctionSchema,
	}),
])

export const TasksSchema = z.record(ResourceIdSchema, TaskSchema).optional().describe('Define the tasks in your stack.')
