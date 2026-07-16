import { Duration } from '@awsless/duration'
import { invoke, InvokeOptions } from '@awsless/lambda'
import { schedule } from '@awsless/scheduler'
import { formatRoutePayload } from './bundle.js'
import { createProxy } from '../proxy.js'
import { onFailureQueueArn } from './on-failure.js'
import {
	bindGlobalResourceName,
	bindLocalResourceName,
	BUNDLE_NAME,
	BUNDLE_QUALIFIER,
	formatRouteKey,
	getBundleQualifier,
	IS_TEST,
} from './util.js'

export const getTaskName = bindLocalResourceName('task')

export interface TaskResources {}

type Options = Omit<InvokeOptions, 'payload' | 'name' | 'type' | 'reflectViewableErrors'> & {
	schedule?: Duration | Date
}

export const Task: TaskResources = /*@__PURE__*/ createProxy(stackName => {
	return createProxy(taskName => {
		const name = getTaskName(taskName, stackName)
		const routeKey = formatRouteKey(stackName, 'task', taskName)

		const ctx: Record<string, any> = {
			[name]: async (payload: unknown, options: Options = {}) => {
				// In tests we keep invoking the per-task name
				// so that the task mocks keep working.
				if (IS_TEST) {
					await invoke({
						...options,
						type: 'Event',
						name,
						payload,
					})
				} else if (options.schedule) {
					const resourceTaskName = bindGlobalResourceName('task')

					await schedule({
						name: `${BUNDLE_NAME}:${options.qualifier ?? BUNDLE_QUALIFIER}`,
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
						qualifier: getBundleQualifier(options.qualifier),
						payload: formatRoutePayload(routeKey, payload),
					})
				}
			},
		}

		return ctx[name]
	})
})
