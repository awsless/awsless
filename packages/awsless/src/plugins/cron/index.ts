
import { z } from 'zod'
import { definePlugin } from '../../plugin.js';
import { ScheduleExpressionSchema } from './schema/schedule.js';
import { FunctionSchema, toLambdaFunction } from '../function.js';
import { ResourceIdSchema } from '../../schema/resource-id.js';
import { EventsEventSource } from '../../formation/resource/lambda/event-source/events.js';

export const cronPlugin = definePlugin({
	name: 'cron',
	schema: z.object({
		stacks: z.object({
			/** Define the crons in your stack
			 * @example
			 * {
			 *   crons: {
			 *     CRON_NAME: {
			 *       consumer: 'function.ts',
			 *       schedule: 'rate(5 minutes)',
			 *     }
			 *   }
			 * }
			 * */
			crons: z.record(ResourceIdSchema, z.object({
				/** The consuming lambda function properties */
				consumer: FunctionSchema,

				/** The scheduling expression.
				 * @example 'cron(0 20 * * ? *)'
				 * @example 'rate(5 minutes)'
				 */
				schedule: ScheduleExpressionSchema,

				// Valid JSON passed to the consumer.
				payload: z.unknown().optional(),
			})).optional()
		}).array()
	}),
	onStack(ctx) {
		const { stack, stackConfig } = ctx

		for(const [ id, props ] of Object.entries(stackConfig.crons || {})) {
			const lambda = toLambdaFunction(ctx, id, props.consumer)
			const source = new EventsEventSource(id, lambda, {
				schedule: props.schedule,
				payload: props.payload,
			})

			stack.add(lambda, source)
		}
	},
})
