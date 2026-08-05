import { z } from 'zod'
import { EmailSchema } from '../../config/schema/email.js'
import { FunctionSchema } from '../function/schema.js'

const NotifySchema = z
	.union([
		//
		EmailSchema.transform(v => [v]),
		EmailSchema.array(),
	])
	.describe('Receive an email notification when consuming failure entries goes wrong.')

export const OnFailureDefaultSchema = z
	.union([
		FunctionSchema.transform(consumer => ({
			consumer,
			notify: [],
		})),
		z.object({
			consumer: FunctionSchema,
			notify: NotifySchema.optional(),
		}),
	])
	.optional()
	.describe(
		[
			'Defining a onFailure handler will add a global onFailure handler for the following resources:',
			'- Tasks',
			'- Crons',
			'- Queues',
			'- Topics',
			'- Pubsub',
			'- Table streams',
		].join('\n')
	)
