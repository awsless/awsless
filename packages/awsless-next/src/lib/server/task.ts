import { Duration } from '@awsless/duration'
import { invoke, InvokeOptions } from '@awsless/lambda'
import { schedule } from '@awsless/scheduler'
import { createProxy } from '../proxy.js'
import { BUNDLE_NAME, BUNDLE_QUALIFIER, formatRouteKey, formatRoutePayload } from './bundle.js'
import { onFailureQueueArn } from './on-failure.js'
import { bindGlobalResourceName, bindLocalResourceName, IS_TEST } from './util.js'

export const getTaskName = bindLocalResourceName('task')

export interface TaskResources {}

type Options = Omit<InvokeOptions, 'payload' | 'name' | 'type' | 'qualifier' | 'reflectViewableErrors'> & {
	schedule?: Duration | Date
}

export const Task: TaskResources = /*@__PURE__*/ createProxy(stackName => {
	return createProxy(taskName => {
		const name = getTaskName(taskName, stackName)
		const routeKey = formatRouteKey(stackName, 'task', taskName)

		const ctx: Record<string, any> = {
			[name]: async (payload: unknown, options: Options = {}) => {
				// In tests we keep invoking the per-task name
				// so that the task mocks keep working. A scheduled task still
				// goes through the scheduler, or it would run right away.
				if (IS_TEST && !options.schedule) {
					await invoke({
						...options,
						type: 'Event',
						name,
						payload,
					})
				} else if (options.schedule) {
					const resourceTaskName = bindGlobalResourceName('task')

					await schedule({
						name: `${BUNDLE_NAME}:${BUNDLE_QUALIFIER}`,
						payload: formatRoutePayload(routeKey, payload),
						schedule: options.schedule,
						group: resourceTaskName('group'),
						roleArn: `arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:role/${resourceTaskName('schedule')}`,
						deadLetterArn: onFailureQueueArn,
					})
				} else {
					await invoke({
						...options,
						type: 'Event',
						name: BUNDLE_NAME,
						qualifier: process.env.AWS_LAMBDA_FUNCTION_VERSION ?? BUNDLE_QUALIFIER,
						payload: formatRoutePayload(routeKey, payload),
					})
				}
			},
		}

		return ctx[name]
	})
})
