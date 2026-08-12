import { FunctionSchema } from '../function/schema.js'

// The consumer stays outside the vpc unless it opts in.
const ConsumerSchema = FunctionSchema.transform(consumer => ({
	...consumer,
	vpc: consumer.vpc ?? false,
}))

export const OnErrorLogDefaultSchema = ConsumerSchema.transform(consumer => ({
	consumer,
}))
	.optional()
	.describe('Define a subscription on all Lambda functions logs.')
