// import { Duration } from '@awsless/duration'
import { stringify } from '@awsless/json'
import { invoke, InvokeOptions } from '@awsless/lambda'
import { WeakCache } from '@awsless/weak-cache'
import { createProxy } from '../proxy.js'
import { formatRouteKey, internalInvoke, invokeBundle, isInsideBundle, isStandaloneRoute } from './bundle.js'
import { bindLocalResourceName, IS_TEST } from './util.js'

const cache = new WeakCache<string, Promise<unknown>>()

type FunctionOptions = Omit<InvokeOptions, 'payload' | 'name' | 'type'> & {
	cache?: boolean
}

type FunctionInvokeOptions = Omit<FunctionOptions, 'cache'>

export const getFunctionName = bindLocalResourceName('function')

export interface FunctionResources {}

export const Fn: FunctionResources = /*@__PURE__*/ createProxy(stackName => {
	return createProxy(funcName => {
		const name = getFunctionName(funcName, stackName)
		const routeKey = formatRouteKey(stackName, 'function', funcName)

		const send = async (payload: unknown, options: FunctionInvokeOptions = {}) => {
			// In tests we keep invoking the per-function name
			// so that the function mocks keep working.
			if (IS_TEST) {
				return invoke({
					...options,
					name,
					payload,
				})
			}

			// Stand-alone functions live outside the bundle & are
			// invoked directly, like the old awsless did.
			if (isStandaloneRoute(routeKey)) {
				return invoke({
					...options,
					name,
					payload,
				})
			}

			// Calls between bundled functions run in-process,
			// unless a qualifier or custom client is given.
			if (isInsideBundle() && !options.qualifier && !options.client) {
				return internalInvoke(routeKey, payload)
			}

			return invokeBundle({
				...options,
				routeKey,
				payload,
			})
		}

		const ctx: Record<string, any> = {
			[name]: (payload: unknown, options: FunctionOptions = {}) => {
				const { cache: shouldCache, ...invokeOptions } = options

				if (!shouldCache) {
					return send(payload, invokeOptions)
				}

				const cacheKey = stringify([routeKey, payload, invokeOptions.qualifier])
				const cached = cache.get(cacheKey)

				if (cached) {
					return cached
				}

				// The module scope outlives the invocation, so a rejection is
				// evicted instead of being replayed for the life of the container.
				const pending = send(payload, invokeOptions).catch(error => {
					cache.delete(cacheKey)

					throw error
				})

				cache.set(cacheKey, pending)

				return pending
			},
		}

		const call = ctx[name]

		call.cached = (payload: unknown, options: FunctionInvokeOptions = {}) => {
			return call(payload, { ...options, cache: true })
		}

		return call
	})
})
