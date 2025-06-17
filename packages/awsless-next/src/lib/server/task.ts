import { invoke, InvokeOptions } from '@awsless/lambda'
import { createProxy } from '../proxy.js'
import { bindLocalResourceName } from './util.js'

export const getTaskName = bindLocalResourceName('task')

export interface TaskResources {}

export const Task: TaskResources = /*@__PURE__*/ createProxy(stackName => {
	return createProxy(taskName => {
		const name = getTaskName(taskName, stackName)
		const ctx: Record<string, any> = {
			[name]: (payload: unknown, options: Omit<InvokeOptions, 'payload' | 'name' | 'type'> = {}) => {
				// schedule(
				// 	{
				// 		// deadletterArn: formatGlobalResourceName({
				// 		// 	appName: ctx.app.name,
				// 		// 	resourceType: 'on-failure',
				// 		// 	resourceName: 'failure',
				// 		// })
				// 	}
				// )

				return invoke({
					...options,
					type: 'Event',
					name,
					payload,
				})
			},
		}

		return ctx[name]
	})
})
