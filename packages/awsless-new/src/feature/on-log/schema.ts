// import { z } from 'zod'
// import { LocalFileSchema } from '../../config/schema/local-file.js'
// import { ResourceIdSchema } from '../../config/schema/resource-id.js'
import { FunctionSchema } from '../function/schema.js'

// const LogFilterSchema = z
// 	.string()
// 	.optional()
// 	.default('{$.level = ERROR}')
// 	.describe('The filtering expressions that restrict what gets delivered to the consumer.')

// export const LogSubscriptionSchema = z
// 	.record(
// 		ResourceIdSchema,
// 		z.union([
// 			LocalFileSchema.transform(file => ({
// 				consumer: { file },
// 				filter: LogFilterSchema,
// 			})),
// 			z.object({
// 				consumer: FunctionSchema.describe('The consuming lambda function properties.'),
// 				filter: LogFilterSchema,
// 			}),
// 		])
// 	)
// 	.optional()
// 	.describe(
// 		'Log Subscription allow you to subscribe to a real-time stream of log events and have them delivered to a specific destination'
// 	)

export const OnLogSchema = FunctionSchema.optional().describe(
	'Log aubscription allow you to subscribe to a real-time stream of log events and have them delivered to a specific destination.'
)
