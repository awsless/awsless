import { z } from 'zod'
import { LocalFileSchema } from '../../config/schema/local-file.js'

export const LogSubscriptionSchema = z
	.union([
		LocalFileSchema.transform(file => ({
			file,
		})),
		z.object({
			subscriber: LocalFileSchema,
			filter: z.string().optional().default('{$.level = ERROR}'),
		}),
	])
	.describe(
		'Log Subscription allow you to subscribe to a real-time stream of log events and have them delivered to a specific destination'
	)
