import { invoke, InvokeOptions } from '@awsless/lambda'
import { WeakCache } from '@awsless/weak-cache'
import { createProxy } from '../proxy.js'
import { bindLocalResourceName } from './util.js'

const cache = new WeakCache<string, unknown>()

export const getFunctionName = bindLocalResourceName('function')

export interface FunctionResources {}

export const Function: FunctionResources = /*@__PURE__*/ createProxy(stackName => {
	return createProxy(funcName => {
		const name = getFunctionName(funcName, stackName)
		const ctx: Record<string, any> = {
			[name]: (payload: unknown, options: Omit<InvokeOptions, 'payload' | 'name'> = {}) => {
				return invoke({
					...options,
					name,
					payload,
				})
			},
		}

		const call = ctx[name]

		// call.async = (payload: unknown, options: Omit<InvokeOptions, 'payload' | 'name' | 'type'> = {}) => {
		// 	return invoke({
		// 		...options,
		// 		type: 'Event',
		// 		name,
		// 		payload,
		// 	})
		// }

		call.cached = async (payload: unknown, options: Omit<InvokeOptions, 'payload' | 'name' | 'type'> = {}) => {
			const cacheKey = JSON.stringify({ name, payload, options })

			if (!cache.has(cacheKey)) {
				const result = await invoke({
					...options,
					name,
					payload,
				})

				cache.set(cacheKey, result)
			}

			return cache.get(cacheKey)
		}

		return call
	})
})

export const Fn = Function
