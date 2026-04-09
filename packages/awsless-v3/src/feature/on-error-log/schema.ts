import { FunctionSchema } from '../function/schema.js'

export const OnErrorLogDefaultSchema = FunctionSchema.optional().describe(
	'Define a subscription on all Lambda functions logs.'
)
