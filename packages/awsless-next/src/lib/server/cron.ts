import { invoke, InvokeOptions } from '@awsless/lambda'
import { createProxy } from '../proxy.js'
import { BUNDLE_NAME, BUNDLE_QUALIFIER, formatRouteKey, formatRoutePayload } from './bundle.js'
import { bindLocalResourceName, IS_TEST } from './util.js'

export const getCronName = bindLocalResourceName('cron')

export interface CronResources {}

type Options = Omit<InvokeOptions, 'payload' | 'name' | 'type' | 'qualifier' | 'reflectViewableErrors'>

export const Cron: CronResources = /*@__PURE__*/ createProxy(stackName => {
	return createProxy(cronName => {
		const name = getCronName(cronName, stackName)
		const routeKey = formatRouteKey(stackName, 'cron', cronName)
		const ctx: Record<string, any> = {
			[name]: async (payload: unknown, options: Options = {}) => {
				if (IS_TEST) {
					await invoke({
						...options,
						type: 'Event',
						name,
						payload,
					})
					return
				}

				await invoke({
					...options,
					type: 'Event',
					name: BUNDLE_NAME,
					qualifier: process.env.AWS_LAMBDA_FUNCTION_VERSION ?? BUNDLE_QUALIFIER,
					payload: formatRoutePayload(routeKey, payload),
				})
			},
		}

		return ctx[name]
	})
})
