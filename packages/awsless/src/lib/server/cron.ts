import { invoke, InvokeOptions } from '@awsless/lambda'
import { createProxy } from '../proxy.js'
import { formatRouteKey, invokeBundle } from './bundle.js'
import { bindLocalResourceName, IS_TEST } from './util.js'

export const getCronName = bindLocalResourceName('cron')

export interface CronResources {}

type Options = Omit<InvokeOptions, 'payload' | 'name' | 'type' | 'qualifier' | 'reflectViewableErrors'>

export const Cron: CronResources = /*@__PURE__*/ createProxy(stackName => {
	return createProxy(cronName => {
		const name = getCronName(cronName, stackName)
		const routeKey = formatRouteKey(stackName, 'cron', cronName)
		const ctx: Record<string, any> = {
			// A manual cron trigger invokes synchronously: awaiting it
			// means the run finished, so a seed can rely on its writes &
			// a failed run throws instead of vanishing.
			[name]: async (payload: unknown, options: Options = {}) => {
				if (IS_TEST) {
					await invoke({
						...options,
						type: 'RequestResponse',
						name,
						payload,
					})
					return
				}

				await invokeBundle({
					...options,
					routeKey,
					payload,
					type: 'RequestResponse',
				})
			},
		}

		return ctx[name]
	})
})
