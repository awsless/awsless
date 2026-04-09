import { TaskSchema } from '../task/schema.js'

export const OnErrorLogDefaultSchema = TaskSchema.optional().describe(
	'Define a subscription on all Lambda functions logs.'
)
