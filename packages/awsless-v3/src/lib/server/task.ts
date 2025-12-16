import { Duration } from '@awsless/duration'
import { invoke, InvokeOptions } from '@awsless/lambda'
import { schedule } from '@awsless/scheduler'
import { createProxy } from '../proxy.js'
import { onFailureQueue } from './on-failure.js'
import { bindGlobalResourceName, bindLocalResourceName } from './util.js'

export const getTaskName = bindLocalResourceName('task')

export interface TaskResources {}

type Options = Omit<InvokeOptions, 'payload' | 'name' | 'type' | 'reflectViewableErrors'> & {
	schedule?: Duration | Date
}

export const Task: TaskResources = /*@__PURE__*/ createProxy(stackName => {
	return createProxy(taskName => {
		const name = getTaskName(taskName, stackName)
		const ctx: Record<string, any> = {
			[name]: async (payload: unknown, options: Options = {}) => {
				if (options.schedule) {
					const resourceTaskName = bindGlobalResourceName('task')

					await schedule({
						name,
						payload,
						schedule: options.schedule,
						group: resourceTaskName('group'),
						roleArn: `arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/${resourceTaskName('schedule')}`,
						deadLetterArn: onFailureQueue,
					})
				} else {
					await invoke({
						...options,
						type: 'Event',
						name,
						payload,
					})
				}
			},
		}

		return ctx[name]
	})
})
