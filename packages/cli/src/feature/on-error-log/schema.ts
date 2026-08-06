import { z } from 'zod'
import { FunctionSchema } from '../function/schema.js'

// The consumer stays outside the vpc unless it opts in.
const ConsumerSchema = FunctionSchema.transform(consumer => ({
	...consumer,
	vpc: consumer.vpc ?? false,
}))

export const OnErrorLogDefaultSchema = z
	.union([
		ConsumerSchema.transform(consumer => ({
			consumer,
		})),
		z.object({
			consumer: ConsumerSchema,
		}),
	])
	.optional()
	.describe('Define a subscription on all Lambda functions logs.')
