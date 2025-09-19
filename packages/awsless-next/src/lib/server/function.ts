// import { Duration } from '@awsless/duration'
import { stringify } from '@awsless/json'
import { invoke, InvokeOptions } from '@awsless/lambda'
import { WeakCache } from '@awsless/weak-cache'
import { createProxy } from '../proxy.js'
import { bindLocalResourceName } from './util.js'

const cache = new WeakCache<string, Promise<unknown>>()

type FunctionOptions = Omit<InvokeOptions, 'payload' | 'name' | 'type'> & {
	cache?: boolean
}

export const getFunctionName = bindLocalResourceName('function')

export interface FunctionResources {}

export const Function: FunctionResources = /*@__PURE__*/ createProxy(stackName => {
	return createProxy(funcName => {
		const name = getFunctionName(funcName, stackName)
		const ctx: Record<string, any> = {
			[name]: (payload: unknown, options: FunctionOptions = {}) => {
				if (!options.cache) {
					return invoke({
						...options,
						name,
						payload,
					})
				}

				const cacheKey = stringify([name, payload, options.qualifier])

				if (!cache.has(cacheKey)) {
					const promise = invoke({
						...options,
						name,
						payload,
					})

					cache.set(cacheKey, promise)
				}

				return cache.get(cacheKey)
			},
		}

		const call = ctx[name]

		call.cached = (payload: unknown, options: Omit<InvokeOptions, 'payload' | 'name' | 'type'> = {}) => {
			const cacheKey = JSON.stringify({ name, payload, options })

			if (!cache.has(cacheKey)) {
				const promise = invoke({
					...options,
					name,
					payload,
				})

				cache.set(cacheKey, promise)
			}

			return cache.get(cacheKey)
		}

		return call
	})
})

export const Fn = Function
