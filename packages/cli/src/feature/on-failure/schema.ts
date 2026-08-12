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

// The consumer stays outside the vpc unless it opts in.
const ConsumerSchema = FunctionSchema.transform(consumer => ({
	...consumer,
	vpc: consumer.vpc ?? false,
}))

export const OnFailureDefaultSchema = z
	.union([
		ConsumerSchema.transform(consumer => ({
			consumer,
			notify: [],
		})),
		z.object({
			consumer: ConsumerSchema,
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
