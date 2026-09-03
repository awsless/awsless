import { patch, unpatch } from '@awsless/json'
import { ExpectedError, invoke, isErrorResponse, LambdaContext, RoutedLambdaContext } from '@awsless/lambda'
import {
	captureInvokedQualifier,
	formatRoutePayload,
	getCurrentRoute,
	getInvokedQualifier,
	getStandaloneFunctionName,
	LIVE_BUNDLE_ALIAS,
	ROUTE_HEADER,
	ROUTE_PROPERTY,
	setBundleRoutes,
	withBundleRouteContext,
} from 'awsless'
import { cronHandler } from './resource/cron.js'
import { functionHandler } from './resource/function.js'
import { iconHandler } from './resource/icon.js'
import { imageHandler } from './resource/image.js'
import { logHandler } from './resource/log.js'
import { metricHandler } from './resource/metric.js'
import { onFailureHandler } from './resource/on-failure.js'
import { pubsubHandler } from './resource/pubsub.js'
import { queueHandler } from './resource/queue.js'
import { restHandler } from './resource/rest.js'
import { routeHandler } from './resource/route.js'
import { rpcHandler } from './resource/rpc.js'
import { siteHandler } from './resource/site.js'
import { storeHandler } from './resource/store.js'
import { tableHandler } from './resource/table.js'
import { taskHandler } from './resource/task.js'
import { topicHandler } from './resource/topic.js'
import type { BundleEvent, RouteMatch, RouteMatcher } from './resource/types.js'
import { routeType } from './resource/util.js'

type LoadHandler = () => Promise<(event: unknown, context: LambdaContext) => unknown>

// The local dev worker reads the active route to tag console output.
export { getCurrentRoute } from 'awsless'

export const createBundle = (handlers: Record<string, LoadHandler>) => {
	const routes = Object.keys(handlers)

	setBundleRoutes(routes)

	const matchers: RouteMatcher[] = [
		functionHandler,
		cronHandler,
		iconHandler,
		imageHandler,
		metricHandler,
		// The on-failure & on-error-log consumers only run as bundle
		// routes on the local dev worker - deployed apps run them as
		// stand-alone lambdas outside the bundle.
		onFailureHandler,
		logHandler,
		queueHandler,
		pubsubHandler,
		topicHandler,
		taskHandler,
		restHandler,
		routeHandler,
		rpcHandler,
		siteHandler,
		storeHandler,
		tableHandler,
	]

	const matchRoute = (event: BundleEvent) => {
		for (const matcher of matchers) {
			const match = matcher(event, routes)

			if (match) {
				return match
			}
		}

		throw new Error(`Unknown bundle route: ${event?.[ROUTE_PROPERTY] ?? event?.headers?.[ROUTE_HEADER]} `)
	}

	return async (event: BundleEvent, context: LambdaContext) => {
		captureInvokedQualifier(context)

		const handleRoute = (match: RouteMatch) => {
			const load = handlers[match.key]

			if (!load) {
				// Function routes outside the bundle table are served by
				// their own stand-alone lambda, invoked inside the same
				// deployment for callers that route through the bundle.
				if (routeType(match.key) === 'function') {
					return invoke({
						name: getStandaloneFunctionName(match.key),
						qualifier: getInvokedQualifier() ?? LIVE_BUNDLE_ALIAS,
						payload: match.payload,
					})
				}

				throw new Error('Unknown bundle route: ' + match.key)
			}

			// Only trace inside a real lambda, where AWS_EXECUTION_ENV is defined
			if (process.env.AWS_EXECUTION_ENV) {
				console.trace(`Bundle route: ${match.key}`)
			}

			process.env.AWSLESS_ROUTE = match.key

			// The expected error mode rides on the route context, so
			// concurrent routes in one process never share a global flag.
			return withBundleRouteContext(
				match.key,
				internalInvoke,
				async () => {
					const handle = await load()

					// The route on the context ends up in error logs, so log
					// consumers can attribute an error to a logical resource
					// instead of the shared bundle function.
					const routedContext: RoutedLambdaContext = { ...context, route: match.key }

					return handle(match.payload ?? {}, routedContext)
				},
				{ throwExpectedErrors: match.throwExpectedErrors }
			)
		}

		const internalInvoke = async (key: string, payload: unknown) => {
			const caller = getCurrentRoute()
			let result

			try {
				const match = matchRoute(formatRoutePayload(key, unpatch(payload ?? {})))

				if (Array.isArray(match)) {
					throw new Error('Unknown bundle route: ' + key)
				}

				result = await handleRoute(match)
			} finally {
				// Restore the caller's route env, since the caller keeps running after the nested call.
				if (caller) {
					process.env.AWSLESS_ROUTE = caller
				}
			}

			const response = result === undefined ? undefined : patch(result)

			if (isErrorResponse(response)) {
				throw new ExpectedError(response.__error__.type, response.__error__.message)
			}

			return response
		}

		const match = matchRoute(event)

		// Multiple matches always fan out as separate async invocations.
		// Each route keeps its own retries & failure handling.
		if (Array.isArray(match)) {
			const name = process.env.AWS_LAMBDA_FUNCTION_NAME!
			const qualifier = getInvokedQualifier() ?? LIVE_BUNDLE_ALIAS
			await Promise.all(
				match.map(route =>
					invoke({
						name,
						qualifier,
						type: 'Event',
						payload: formatRoutePayload(route.key, route.payload),
					})
				)
			)
			return
		}

		return handleRoute(match)
	}
}
