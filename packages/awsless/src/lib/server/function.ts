import { stringify } from '@awsless/json'
import { ExpectedError, invoke, InvokeOptions } from '@awsless/lambda'
import { WeakCache } from '@awsless/weak-cache'
import { createProxy } from '../proxy.js'
import {
	formatRouteKey,
	getInvokedQualifier,
	hasBundleRoute,
	internalInvoke,
	invokeBundle,
	isInsideBundle,
	LIVE_BUNDLE_ALIAS,
} from './bundle.js'
import { bindLocalResourceName, isTest } from './util.js'

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
			// Tests invoke the per-function name, so the name-keyed mocks keep working.
			if (isTest()) {
				return invoke({
					...options,
					name,
					payload,
				})
			}

			if (isInsideBundle()) {
				// A route outside the bundle table is a stand-alone lambda in the same deployment.
				if (!hasBundleRoute(routeKey)) {
					return invoke({
						...options,
						name,
						qualifier: options.qualifier ?? getInvokedQualifier() ?? LIVE_BUNDLE_ALIAS,
						payload,
					})
				}

				// Bundled functions call each other in-process, unless a qualifier or client is given.
				if (!options.qualifier && !options.client) {
					if (options.reflectViewableErrors === false) {
						return internalInvoke(routeKey, payload).catch(error => {
							if (error instanceof ExpectedError) {
								throw new Error(error.message)
							}

							throw error
						})
					}

					return internalInvoke(routeKey, payload)
				}
			}

			// The bundle forwards stand-alone routes for callers outside of it.
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

				// The cache outlives the invocation, so a rejection must not replay for the container's life.
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
