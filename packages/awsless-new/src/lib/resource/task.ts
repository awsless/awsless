import { invoke, InvokeOptions } from '@awsless/lambda'
import { bindLocalResourceName, createProxy } from './util.js'

export const getTaskName = bindLocalResourceName('task')

export interface TaskResources {}

export const Task: TaskResources = /*@__PURE__*/ createProxy(stackName => {
	return createProxy(taskName => {
		const name = getTaskName(stackName, taskName)
		const ctx: Record<string, any> = {
			[name]: (payload: unknown, options: Omit<InvokeOptions, 'payload' | 'name' | 'type'> = {}) => {
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
