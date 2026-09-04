import { Duration } from '@awsless/duration'
import { invoke, InvokeOptions } from '@awsless/lambda'
import { schedule } from '@awsless/scheduler'
import { createProxy } from '../proxy.js'
import { formatRouteKey, formatRoutePayload, getBundleName, invokeBundle, LIVE_BUNDLE_ALIAS } from './bundle.js'
import { getOnFailureQueueArn } from './on-failure.js'
import { bindGlobalResourceName, bindLocalResourceName, getAccountId, isTest } from './util.js'

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
				const { schedule: scheduleAt, ...invokeOptions } = options

				if (scheduleAt) {
					// The scheduler mock records the per-task name apart from a direct invoke.
					if (isTest()) {
						await schedule({
							name,
							payload,
							schedule: scheduleAt,
							roleArn: '',
						})
						return
					}

					const resourceTaskName = bindGlobalResourceName('task')

					// A schedule can outlive its deployment, so live is the only safe target.
					await schedule({
						name: `${getBundleName()}:${LIVE_BUNDLE_ALIAS}`,
						payload: formatRoutePayload(routeKey, payload),
						schedule: scheduleAt,
						group: resourceTaskName('group'),
						roleArn: `arn:aws:iam::${getAccountId()}:role/${resourceTaskName('schedule')}`,
						deadLetterArn: getOnFailureQueueArn(),
					})
					return
				}

				// Tests invoke the per-task name, so the name-keyed mocks keep working.
				if (isTest()) {
					await invoke({
						...invokeOptions,
						type: 'Event',
						name,
						payload,
					})
					return
				}

				await invokeBundle({
					...invokeOptions,
					routeKey,
					payload,
					type: 'Event',
				})
			},
		}

		return ctx[name]
	})
})
