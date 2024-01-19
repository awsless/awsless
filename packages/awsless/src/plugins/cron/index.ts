import { definePlugin } from '../../plugin.js'
import { toLambdaFunction } from '../function/index.js'
import { EventsEventSource } from '../../formation/resource/lambda/event-source/events.js'

export const cronPlugin = definePlugin({
	name: 'cron',
	onStack(ctx) {
		const { stack, stackConfig } = ctx

		for (const [id, props] of Object.entries(stackConfig.crons || {})) {
			const lambda = toLambdaFunction(ctx, id, props.consumer)
			const source = new EventsEventSource(id, lambda, {
				schedule: props.schedule,
				payload: props.payload,
			})

			stack.add(lambda, source)
		}
	},
})
