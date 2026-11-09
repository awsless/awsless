import { patch, unpatch } from '@awsless/json'
import { ExpectedError, invoke, isErrorResponse, LambdaContext, RoutedLambdaContext } from '@awsless/lambda'
import {
	captureInvokedQualifier,
	flushTraces,
	formatRoutePayload,
	getInvokedQualifier,
	type h,
	getStandaloneFunctionName,
	isTracing,
	LIVE_BUNDLE_ALIAS,
	ROUTE_HEADER,
	ROUTE_PROPERTY,
	runTraceStep,
	setBundleRoutes,
	toFunctionUrlEvent,
	toWebResponse,
	trace,
	withBundleRouteContext,
	withTraceHeader,
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
import { describeRoute } from './trace.js'

type LoadHandler = () => Promise<(event: unknown, context: LambdaContext) => unknown>

// The local dev worker reads the active route to tag console output.
export { getCurrentRoute } from 'awsless'

// The bundle's web function serves its router paths over HTTP.
export { startWebFunctionServer } from './web-function.js'

export const createBundle = (handlers: Record<string, LoadHandler>) => {
	const routes = Object.keys(handlers)

	setBundleRoutes(routes)

	const matchers: RouteMatcher[] = [
		functionHandler,
		cronHandler,
		iconHandler,
		imageHandler,
		metricHandler,
		// Deployed apps run these two consumers as stand-alone lambdas; only
		// the local dev worker routes them through the bundle.
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

	let isFirstInvocation = true

	// Runs the routes of one invocation (or web function request), and the
	// routes they call in-process.
	const createBundleRouteRunner = (context: LambdaContext) => {
		const isColdStart = isFirstInvocation
		isFirstInvocation = false

		const runBundleRoute = (match: RouteMatch, options: BundleRouteOptions = {}) => {
			const { isInternal = false, runHandler } = options
			const load = handlers[match.key]

			if (!load) {
				// A function route outside the bundle table is a stand-alone lambda
				// in the same deployment, for callers that route through the bundle.
				if (routeType(match.key) === 'function') {
					return invoke({
						name: getStandaloneFunctionName(match.key),
						qualifier: getInvokedQualifier() ?? LIVE_BUNDLE_ALIAS,
						payload: match.payload,
					})
				}

				throw new Error('Unknown bundle route: ' + match.key)
			}

			// The expected error mode rides on the route context, so
			// concurrent routes in one process never share a global flag.
			return withBundleRouteContext(
				match.key,
				internalInvoke,
				() => {
					// A span per route, so a function called in-process shows under its caller.
					return trace(
						match.key,
						async () => {
							const handle = await load()

							// Error logs carry the route, so log consumers attribute an error
							// to a logical resource instead of the shared bundle.
							const routedContext: RoutedLambdaContext = { ...context, route: match.key }

							return runHandler
								? runHandler(handle, routedContext)
								: handle(match.payload ?? {}, routedContext)
						},
						// Described only when traced; a describer that throws leaves the span bare.
						isTracing()
							? runTraceStep({}, () => describeRoute(match, { isInternal, isColdStart, context }))
							: undefined
					)
				},
				{ throwExpectedErrors: match.throwExpectedErrors }
			)
		}

		const internalInvoke = async (key: string, payload: unknown) => {
			const match = matchRoute(formatRoutePayload(key, unpatch(payload ?? {})))

			if (Array.isArray(match)) {
				throw new Error('Unknown bundle route: ' + key)
			}

			const result = await runBundleRoute(match, { isInternal: true })
			const response = result === undefined ? undefined : patch(result)

			if (isErrorResponse(response)) {
				const { type, message, data } = response.__error__

				throw new ExpectedError(type, message, data)
			}

			return response
		}

		return runBundleRoute
	}

	const handleEvent = async (event: BundleEvent, context: LambdaContext) => {
		captureInvokedQualifier(context)

		const runBundleRoute = createBundleRouteRunner(context)
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

		return runBundleRoute(match)
	}

	// A request to the web function. A route whose handler takes web
	// requests (h.route, h.site, the rpc server) streams its request &
	// response; any other gets the function url event, read whole. The
	// response is written inside the route's context.
	const serveRequest = async (
		request: Request,
		writeResponse: (response: Response) => Promise<void>,
		context: LambdaContext
	) => {
		const key = request.headers.get(ROUTE_HEADER) ?? ''

		if (!handlers[key]) {
			throw new Error('Unknown bundle route: ' + key)
		}

		// Lambda appends the address that connected, CloudFront's edge, as a function url's source ip.
		const sourceIp = request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
		const runBundleRoute = createBundleRouteRunner(context)

		await runBundleRoute(
			{ key, payload: undefined },
			{
				runHandler: async (handle, routedContext) => {
					const { fetch } = handle as Partial<h.RouteEntry>
					const response = fetch
						? await fetch(request, routedContext)
						: toWebResponse(await handle(await toFunctionUrlEvent(request, { sourceIp }), routedContext))

					await writeResponse(response)
				},
			}
		)
	}

	const handler = async (event: BundleEvent, context: LambdaContext) => {
		// Lambda Managed Instances give the trace header on the context only, without _X_AMZN_TRACE_ID.
		const { xRayTraceId } = context as LambdaContext & { xRayTraceId?: string }

		try {
			return await withTraceHeader(xRayTraceId, () => handleEvent(event, context))
		} finally {
			// The spans still on their way go out before Lambda freezes the process.
			await flushTraces()
		}
	}

	return Object.assign(handler, { serveRequest })
}

type BundleRouteOptions = {
	// A route called in-process by another, for its trace.
	isInternal?: boolean
	// Runs the loaded handler another way than with the match's payload (the web function's request).
	runHandler?: (handle: Awaited<ReturnType<LoadHandler>>, context: RoutedLambdaContext) => unknown
}

export type Bundle = ReturnType<typeof createBundle>
