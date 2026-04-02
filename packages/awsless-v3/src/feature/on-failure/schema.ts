import { FunctionSchema } from '../function/schema.js'

export const OnFailureDefaultSchema = FunctionSchema.optional().describe(
	[
		'Defining a onFailure handler will add a global onFailure handler for the following resources:',
		'- Tasks',
		'- Crons',
		// '- Queues',
		'- Topics',
		'- Pubsub',
		'- Table streams',
	].join('\n')
)
