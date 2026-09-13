import { invoke, InvokeOptions } from '@awsless/lambda'
import { createProxy } from '../proxy.js'
import { formatRouteKey, invokeBundle } from './bundle.js'
import { bindLocalResourceName, isTest } from './util.js'

export const getCronName = bindLocalResourceName('cron')

export interface CronResources {}

type Options = Omit<InvokeOptions, 'payload' | 'name' | 'type' | 'qualifier' | 'reflectViewableErrors'>

export const Cron: CronResources = /*@__PURE__*/ createProxy(stackName => {
	return createProxy(cronName => {
		const name = getCronName(cronName, stackName)
		const routeKey = formatRouteKey(stackName, 'cron', cronName)
		const ctx: Record<string, any> = {
			// Synchronous, so a seed can rely on the run's writes & a failed run
			// throws instead of vanishing.
			[name]: async (payload: unknown, options: Options = {}) => {
				if (isTest()) {
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
