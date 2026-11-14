import { AsyncLocalStorage } from 'node:async_hooks'
import {
	Context,
	enhanceError,
	ExpectedError,
	Invocation,
	LambdaContext,
	runInvocation,
	toErrorResponse,
} from '@awsless/lambda'
import { FunctionUrlResult, toFunctionUrlResult, toWebRequest, getViewerIp } from '../server/http.js'

/** What a route or site handler receives. */
export type RouteEvent = {
	/** The web request: its method, url & headers, and a body streamed as it arrives. */
	readonly request: Request

	/** The route path parameters. */
	readonly params: Record<string, string>

	/** The caller's ip address: CloudFront's viewer address behind a router, else the connection's. */
	readonly ip: string
}

type RouteHandler = (event: RouteEvent, context: Context) => Response | Promise<Response>

/**
 * A route entry: called with a function url (or http api) event it answers
 * the result read whole; its fetch takes a web Request & answers the Response
 * as the handler streams it, on the web function.
 */
export type RouteEntry = {
	(event: unknown, context?: LambdaContext): Promise<FunctionUrlResult>
	fetch: (request: Request, context?: LambdaContext) => Promise<Response>
}

// A param with a broken escape (a request for `/items/%E0%A4`) stays as
// written, for the handler's validation to refuse rather than a 500.
const decodeParam = (value: string) => {
	try {
		return decodeURIComponent(value)
	} catch {
		return value
	}
}

// Router routes deliver params as x-param-* headers. The deployed router
// encodes each value, so it round-trips any character.
const getRouteParams = (headers: Headers) => {
	const params: Record<string, string> = {}

	headers.forEach((value, name) => {
		if (name.startsWith('x-param-')) {
			params[name.slice('x-param-'.length)] = decodeParam(value)
		}
	})

	return params
}

// Bad input is a 400, any other expected error a 500.
const createErrorResponse = (error: { type: string; message: string; data?: unknown }) => {
	return Response.json(
		{ type: error.type, message: error.message, data: error.data },
		{ status: error.type === 'validation' ? 400 : 500 }
	)
}

type RunInContext = <R>(callback: () => R) => R

// A body stream that finishes the invocation once it's read to the end,
// fails or the caller goes away. Each read runs in the handler's own async
// context, so a stream's own work still reaches getContext() & in-process Fn calls.
const finishInvocationAfterBody = (
	body: ReadableStream<Uint8Array>,
	runInContext: RunInContext,
	finishInvocation: Invocation<unknown>['finishInvocation'],
	toLoggedError: (error: unknown) => Error
) => {
	const reader = body.getReader()

	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			let chunk: ReadableStreamReadResult<Uint8Array>

			try {
				chunk = await runInContext(() => reader.read())
			} catch (error) {
				// The caller sees the logged error once the invocation finished, to log once.
				await finishInvocation({ error })
				controller.error(toLoggedError(error))
				return
			}

			if (!chunk.done) {
				controller.enqueue(chunk.value)
				return
			}

			try {
				// The caller sees the end once the invocation finished.
				await finishInvocation()
				controller.close()
			} catch (error) {
				// A success callback failed the run.
				controller.error(toLoggedError(error))
			}
		},
		async cancel(reason) {
			try {
				await runInContext(() => reader.cancel(reason))
			} finally {
				await finishInvocation()
			}
		},
	})
}

// What a route is called with: the request, its caller's ip, a rest api's path
// parameters, and what the context gives as raw.
type RouteCall = { request: Request; ip: string; params?: Record<string, string>; raw: unknown }

const createRouteRunner = (handle: RouteHandler) => {
	return async (call: RouteCall, lambdaContext?: LambdaContext): Promise<Response> => {
		const { request } = call

		// What an error logs of the request: never its headers, query, body or ip,
		// which could hold a credential or personal data.
		const input = { method: request.method, path: new URL(request.url).pathname }
		const toLoggedError = (error: unknown) => enhanceError(error, undefined, input, lambdaContext)

		// The handler's async context, for reading a streamed body.
		let runInContext: RunInContext = callback => callback()

		const invocation = await runInvocation({
			input,
			raw: call.raw,
			context: lambdaContext,
			handle: async (_, context) => {
				const response = await handle(
					{
						request,
						params: call.params ?? getRouteParams(request.headers),
						ip: call.ip,
					},
					context
				)

				runInContext = AsyncLocalStorage.snapshot() as RunInContext

				return response
			},
		})

		// A finished invocation's error: an expected one returned as json, any other thrown.
		const returnOrThrowError = (error: unknown) => {
			if (error instanceof ExpectedError) {
				return createErrorResponse(toErrorResponse(error).__error__)
			}

			throw toLoggedError(error)
		}

		if (!invocation.isSuccessful) {
			await invocation.finishInvocation({ error: invocation.error })

			return returnOrThrowError(invocation.error)
		}

		const response = invocation.result

		if (!response.body) {
			try {
				await invocation.finishInvocation()
			} catch (error) {
				// A success callback failed the run.
				return returnOrThrowError(error)
			}

			return response
		}

		return new Response(
			finishInvocationAfterBody(response.body, runInContext, invocation.finishInvocation, toLoggedError),
			{ status: response.status, statusText: response.statusText, headers: response.headers }
		)
	}
}

/** A route handler: a web Request in, a Response out. */
export const route = (handle: RouteHandler): RouteEntry => {
	const runRoute = createRouteRunner(handle)

	const entry = async (event: unknown, context?: LambdaContext) => {
		const { request, sourceIp, pathParameters } = toWebRequest(event)
		const params = pathParameters && Object.keys(pathParameters).length > 0 ? pathParameters : undefined
		const ip = getViewerIp(request.headers) ?? sourceIp

		return toFunctionUrlResult(await runRoute({ request, ip, params, raw: event }, context))
	}

	return Object.assign(entry, {
		fetch: async (request: Request, context?: LambdaContext) => {
			// Only CloudFront calls the web function, and it always names the viewer.
			return runRoute({ request, ip: getViewerIp(request.headers)!, raw: request }, context)
		},
	})
}

/** A site ssr handler: a route. */
export const site = route
