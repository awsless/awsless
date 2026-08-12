import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { BundledFunctionSchema } from '../function/schema.js'

export const TaskSchema = z.union([
	BundledFunctionSchema.transform(consumer => ({
		consumer,
	})),
	z.object({
		consumer: BundledFunctionSchema,
	}),
])

export const TasksSchema = z.record(ResourceIdSchema, TaskSchema).optional().describe('Define the tasks in your stack.')
