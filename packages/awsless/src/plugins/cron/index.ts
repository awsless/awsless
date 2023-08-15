
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
			crons: z.record(ResourceIdSchema, z.object({
				consumer: FunctionSchema,
				schedule: ScheduleExpressionSchema,
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
