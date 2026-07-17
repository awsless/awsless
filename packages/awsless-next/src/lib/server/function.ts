// import { Duration } from '@awsless/duration'
import { stringify } from '@awsless/json'
import { invoke, InvokeOptions } from '@awsless/lambda'
import { WeakCache } from '@awsless/weak-cache'
import { createProxy } from '../proxy.js'
import {
	BUNDLE_NAME,
	BUNDLE_QUALIFIER,
	formatRouteKey,
	formatRoutePayload,
	invokeRoute,
	isInsideBundle,
} from './bundle.js'
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

		// In tests we keep invoking the per-function name
		// so that the function mocks keep working.
		const send = async (payload: unknown, options: FunctionInvokeOptions = {}) => {
			if (IS_TEST) {
				return invoke({
					...options,
					name,
					payload,
				})
			}

			// Inside the bundle we dispatch in-process instead of self-invoking.
			if (isInsideBundle() && !options.qualifier && !options.client) {
				return invokeRoute(routeKey, payload)
			}

			return invoke({
				...options,
				name: BUNDLE_NAME,
				qualifier: options.qualifier ?? process.env.AWS_LAMBDA_FUNCTION_VERSION ?? BUNDLE_QUALIFIER,
				payload: formatRoutePayload(routeKey, payload),
			})
		}

		const ctx: Record<string, any> = {
			[name]: (payload: unknown, options: FunctionOptions = {}) => {
				const { cache: shouldCache, ...invokeOptions } = options

				if (!shouldCache) {
					return send(payload, invokeOptions)
				}

				const cacheKey = stringify([routeKey, payload, invokeOptions.qualifier])

				if (!cache.has(cacheKey)) {
					cache.set(cacheKey, send(payload, invokeOptions))
				}

				return cache.get(cacheKey)
			},
		}

		const call = ctx[name]

		call.cached = (payload: unknown, options: FunctionInvokeOptions = {}) => {
			return call(payload, { ...options, cache: true })
		}

		return call
	})
})
