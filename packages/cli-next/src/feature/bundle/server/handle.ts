import { patch, unpatch } from '@awsless/json'
import { ExpectedError, invoke, isErrorResponse, LambdaContext } from '@awsless/lambda'
import { formatRoutePayload, getCurrentRoute, ROUTE_PROPERTY, withRoute } from 'awsless'
import type { LambdaFunctionURLEvent } from 'aws-lambda'
import { matchEventSource } from './source.js'

type LoadHandler = () => Promise<(event: unknown, context: LambdaContext) => unknown>

type BundleEvent = {
	'$awsless-route'?: string
	event?: unknown
	headers?: LambdaFunctionURLEvent['headers']
}

// Async event handlers run with expected-error responses enabled,
// like the old dedicated async lambdas did.
const asyncRouteTypes = new Set([
	'cron',
	'task',
	'queue',
	'topic',
	'store',
	'table',
	'metric',
	'on-failure',
	'on-error-log',
])

// Route types reachable through the router's request header.
const webRouteTypes = new Set(['rest', 'site', 'icon', 'image', 'rpc'])

const routeType = (routeKey: string) => routeKey.split(':')[1]!

// Runtime for the single app bundle lambda that hosts every handler.
// The generated entry file provides the env & lazy handler map.

export const createBundle = (env: Record<string, string>, handlers: Record<string, LoadHandler>) => {
	const topicSubscribers = new Map<string, string[]>()

	for (const routeKey of Object.keys(handlers)) {
		const [, type, id] = routeKey.split(':')

		if (type === 'topic') {
			const subscribers = topicSubscribers.get(id!) ?? []

			subscribers.push(routeKey)
			topicSubscribers.set(id!, subscribers)
		}
	}

	// The real lambda environment always wins over the bundled environment.
	for (const [name, value] of Object.entries(env)) {
		process.env[name] ??= value
	}

	return async (event: BundleEvent, context: LambdaContext) => {
		// The flag is applied per dispatched route, before the handler module
		// is lazily loaded, so module level reads capture the right value even
		// for nested in-process invokes.
		const applyExpectedErrors = (key: string) => {
			if (asyncRouteTypes.has(routeType(key))) {
				process.env.THROW_EXPECTED_ERRORS = '1'
			} else {
				delete process.env.THROW_EXPECTED_ERRORS
			}
		}

		const handleRoute = (key: string, payload: unknown) => {
			const load = handlers[key]

			if (!load) {
				throw new Error('Unknown bundle route: ' + key)
			}

			applyExpectedErrors(key)

			// Best effort compat for handlers reading the env directly; parallel
			// in-process invokes can observe another route's values, while the
			// AsyncLocalStorage backed getStack() / getRouteEnv() stay correct.
			const [stack] = key.split(':')
			process.env.STACK = stack
			process.env.AWSLESS_ROUTE = key

			return withRoute(key, invokeRoute, async () => {
				const handle = await load()

				return handle(payload ?? {}, context)
			})
		}

		const invokeRoute = async (key: string, payload: unknown) => {
			const caller = getCurrentRoute()
			let result

			try {
				result = await handleRoute(key, unpatch(payload ?? {}))
			} finally {
				if (caller) {
					process.env.STACK = caller.split(':')[0]
					process.env.AWSLESS_ROUTE = caller
					applyExpectedErrors(caller)
				}
			}

			const response = result === undefined ? undefined : patch(result)

			if (isErrorResponse(response)) {
				throw new ExpectedError(response.__error__.type, response.__error__.message)
			}

			return response
		}

		// Invoke envelopes address a bundle route directly.
		const route = event?.[ROUTE_PROPERTY]

		if (typeof route === 'string') {
			return handleRoute(route, event.event)
		}

		// Web requests routed through CloudFront carry the route header.
		const headerRoute = event?.headers?.['x-awsless-route']

		if (typeof headerRoute === 'string') {
			if (!webRouteTypes.has(routeType(headerRoute))) {
				throw new Error('Unknown bundle route: ' + headerRoute)
			}

			// Restore the viewer authorization that the router tunneled around
			// the OAC sigv4 signing, which owns the real authorization header.
			const authorization = event.headers?.['x-awsless-authorization']

			if (typeof authorization === 'string') {
				event.headers!.authorization = authorization
				delete event.headers!['x-awsless-authorization']
			}

			return handleRoute(headerRoute, event)
		}

		// Raw AWS event source events map back onto routes.
		const match = matchEventSource(event, topicSubscribers)

		if (match) {
			if ('fanout' in match) {
				const name = `${process.env.AWS_LAMBDA_FUNCTION_NAME}:${process.env.AWS_LAMBDA_FUNCTION_VERSION}`

				await Promise.all(
					match.fanout.map(route =>
						invoke({
							name,
							type: 'Event',
							payload: formatRoutePayload(route.key, route.payload),
						})
					)
				)

				return
			}

			return handleRoute(match.key, match.payload)
		}

		throw new Error('Unknown bundle route: undefined')
	}
}
