import { patch, unpatch } from '@awsless/json'
import { ExpectedError, invoke, isErrorResponse, LambdaContext } from '@awsless/lambda'
import { formatRoutePayload, getCurrentRoute, withBundleRouteContext } from 'awsless'
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

type LoadHandler = () => Promise<(event: unknown, context: LambdaContext) => unknown>

export const createBundle = (handlers: Record<string, LoadHandler>) => {
	const routes = Object.keys(handlers)

	const matchers: RouteMatcher[] = [
		functionHandler,
		cronHandler,
		iconHandler,
		imageHandler,
		metricHandler,
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
		// Expected errors start disabled on every dispatch & only the matched route can enable them.
		delete process.env.THROW_EXPECTED_ERRORS

		for (const matcher of matchers) {
			const match = matcher(event, routes)

			if (match) {
				return match
			}
		}

		throw new Error(`Unknown bundle route: ${event?.['$awsless-route'] ?? event?.headers?.['x-awsless-route']} `)
	}

	return async (event: BundleEvent, context: LambdaContext) => {
		const handleRoute = (match: RouteMatch) => {
			const load = handlers[match.key]

			if (!load) {
				throw new Error('Unknown bundle route: ' + match.key)
			}

			process.env.AWSLESS_ROUTE = match.key

			return withBundleRouteContext(match.key, internalInvoke, async () => {
				const handle = await load()

				// The route on the context ends up in error logs, so log
				// consumers can attribute an error to a logical resource
				// instead of the shared bundle function.
				const routedContext: LambdaContext & { route: string } = { ...context, route: match.key }

				return handle(match.payload ?? {}, routedContext)
			})
		}

		const internalInvoke = async (key: string, payload: unknown) => {
			const caller = getCurrentRoute()
			const throwExpectedErrors = process.env.THROW_EXPECTED_ERRORS
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

					if (throwExpectedErrors) {
						process.env.THROW_EXPECTED_ERRORS = throwExpectedErrors
					} else {
						delete process.env.THROW_EXPECTED_ERRORS
					}
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
			const name = `${process.env.AWS_LAMBDA_FUNCTION_NAME}:${process.env.AWS_LAMBDA_FUNCTION_VERSION}`
			await Promise.all(
				match.map(route =>
					invoke({
						name,
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
