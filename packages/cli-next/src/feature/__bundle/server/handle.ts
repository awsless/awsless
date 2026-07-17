import { patch, unpatch } from '@awsless/json'
import { ExpectedError, invoke, isErrorResponse, LambdaContext } from '@awsless/lambda'
import { getCurrentRoute, withRoute } from 'awsless'
import { cronHandler } from './handler/cron.js'
import { functionHandler } from './handler/function.js'
import { iconHandler } from './handler/icon.js'
import { imageHandler } from './handler/image.js'
import { logHandler } from './handler/log.js'
import { metricHandler } from './handler/metric.js'
import { onFailureHandler } from './handler/on-failure.js'
import { queueHandler } from './handler/queue.js'
import { restHandler } from './handler/rest.js'
import { rpcHandler } from './handler/rpc.js'
import { siteHandler } from './handler/site.js'
import { storeHandler } from './handler/store.js'
import { tableHandler } from './handler/table.js'
import { taskHandler } from './handler/task.js'
import { createTopicHandler } from './handler/topic.js'
import type { BundleEvent, RouteMatcher } from './handler/types.js'

type LoadHandler = () => Promise<(event: unknown, context: LambdaContext) => unknown>

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

	const matchers: RouteMatcher[] = [
		functionHandler,
		cronHandler,
		iconHandler,
		imageHandler,
		metricHandler,
		onFailureHandler,
		logHandler,
		queueHandler,
		createTopicHandler(topicSubscribers),
		taskHandler,
		restHandler,
		rpcHandler,
		siteHandler,
		storeHandler,
		tableHandler,
	]

	// The real lambda environment always wins over the bundled environment.
	for (const [name, value] of Object.entries(env)) {
		process.env[name] ??= value
	}

	return async (event: BundleEvent, context: LambdaContext) => {
		delete process.env.THROW_EXPECTED_ERRORS

		const authorization = event?.headers?.['x-awsless-authorization']

		if (typeof authorization === 'string') {
			event.headers.authorization = authorization
			delete event.headers['x-awsless-authorization']
		}

		function handleRoute(key: string, payload: unknown) {
			const load = handlers[key]

			if (!load) {
				throw new Error('Unknown bundle route: ' + key)
			}

			const [stack] = key.split(':')
			process.env.STACK = stack
			process.env.AWSLESS_ROUTE = key

			return withRoute(key, invokeRoute, async () => {
				const handle = await load()

				return handle(payload ?? {}, context)
			})
		}

		async function invokeRoute(key: string, payload: unknown) {
			const caller = getCurrentRoute()
			let result

			try {
				result = await handleRoute(key, unpatch(payload ?? {}))
			} finally {
				if (caller) {
					process.env.STACK = caller.split(':')[0]
					process.env.AWSLESS_ROUTE = caller
				}
			}

			const response = result === undefined ? undefined : patch(result)

			if (isErrorResponse(response)) {
				throw new ExpectedError(response.__error__.type, response.__error__.message)
			}

			return response
		}

		for (const matcher of matchers) {
			const match = matcher(event)

			if (!match) {
				continue
			}

			if ('fanout' in match) {
				const name = `${process.env.AWS_LAMBDA_FUNCTION_NAME}:${process.env.AWS_LAMBDA_FUNCTION_VERSION}`

				await Promise.all(
					match.fanout.map(route =>
						invoke({
							name,
							type: 'Event',
							payload: {
								'$awsless-route': route.key,
								event: route.payload,
							},
						})
					)
				)

				return
			}

			if (match.expectedErrors) {
				process.env.THROW_EXPECTED_ERRORS = '1'
			}

			return handleRoute(match.key, match.payload)
		}

		const route = event?.['$awsless-route'] ?? event?.headers?.['x-awsless-route']

		throw new Error('Unknown bundle route: ' + route)
	}
}
