import { invoke, InvokeOptions } from '@awsless/lambda'
import { createProxy } from '../proxy.js'
import { bindLocalResourceName } from './util.js'

export const getCronName = bindLocalResourceName('cron')

export interface CronResources {}

type Options = Omit<InvokeOptions, 'payload' | 'name' | 'type' | 'reflectViewableErrors'>

export const Cron: CronResources = /*@__PURE__*/ createProxy(stackName => {
	return createProxy(taskName => {
		const name = getCronName(taskName, stackName)
		const ctx: Record<string, any> = {
			[name]: async (payload: unknown, options: Options = {}) => {
				await invoke({
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
