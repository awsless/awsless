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
import {
	applyRedaction,
	custom,
	GenericSchema,
	InferOutput,
	json,
	object,
	ObjectEntries,
	ObjectSchema,
	optional,
	pipe,
	record,
	REDACTED,
	redactWith,
	string,
} from '@awsless/validate'
import { FunctionUrlResult, getQuery, toFunctionUrlResult, toWebRequest, getViewerIp } from '../server/http.js'

export type RouteSchemaProps = {
	/** The schema the json request body validates against - the parsed result lands on `data`. */
	body?: GenericSchema

	/** The schema the query string parameters validate against. */
	query?: ObjectSchema<ObjectEntries, undefined> | undefined

	/** The schema the route path parameters validate against. */
	params?: ObjectSchema<ObjectEntries, undefined> | undefined
}

type Op<T extends GenericSchema | undefined, D> = T extends GenericSchema ? InferOutput<T> : D

/** What a route or site handler receives. */
export type RouteEvent<P extends RouteSchemaProps = {}> = {
	/** The web request: its method, url & headers, and a body streamed as it arrives. */
	readonly request: Request

	/** The request's url, parsed. */
	readonly url: URL

	/** The validated route path parameters. */
	readonly params: Op<P['params'], Record<string, string>>

	/** The validated query string parameters, a repeated name's values joined with commas. */
	readonly query: Op<P['query'], Record<string, string>>

	/** The parsed & validated json body, when a body schema is given; the request's own body stays readable. */
	readonly data: Op<P['body'], undefined>

	/** The caller's ip address: CloudFront's viewer address behind a router, else the connection's. */
	readonly ip: string
}

type RouteHandler<P extends RouteSchemaProps> = (event: RouteEvent<P>, context: Context) => Response | Promise<Response>

/**
 * A route entry: called with a function url (or http api) event it answers
 * the result read whole; its fetch takes a web Request & answers the Response
 * as the handler streams it, on the web function.
 */
export type RouteEntry = {
	(event: unknown, context?: LambdaContext): Promise<FunctionUrlResult>
	fetch: (request: Request, context?: LambdaContext) => Promise<Response>
}

// What the route's schema validates: the call, its query, and the body read only for a body schema.
type RouteInput = {
	request: Request
	params: Record<string, string>
	query: Record<string, string>
	body?: string
	ip: string
}

// What a logged request leaves out. Credentials by their name: an
// authorization or api key header, cookies, tokens, secrets & signatures
// (CloudFront's security token, the router password's header). Personal data
// too: the caller's ip & location headers, and body or query fields like an
// email, a name, an address or an ip.
const SECRET_NAME = /authorization|cookie|token|secret|password|api-?key|signature|session|totp|(^|[-_])(otp|code)$/i
const PERSONAL_HEADER =
	/address|forwarded-for|real-ip|client-ip|connecting-ip|(^|-)ip$|viewer-(latitude|longitude|city|postal-code|metro-code|country-region)/i
const PERSONAL_FIELD =
	/e-?mail|phone|address|street|postal|zip-?code|first-?name|last-?name|full-?name|^name$|vat|birth/i
// An ip by its name, case sensitive so `membership` isn't one: `ip`, `ips`,
// `ipAddress`, `visitorIp`, `visitor_ip`.
const IP_FIELD = /^ips?$|^ip[A-Z_-]|[a-z]Ips?$|[_-]ips?$/

const isSecretHeader = (name: string) => SECRET_NAME.test(name) || PERSONAL_HEADER.test(name)
const isSecretField = (name: string) => SECRET_NAME.test(name) || PERSONAL_FIELD.test(name) || IP_FIELD.test(name)

const redactHeaders = (headers: Record<string, string> | undefined) => {
	return (
		headers &&
		Object.fromEntries(
			Object.entries(headers).map(([name, value]) => [name, isSecretHeader(name) ? REDACTED : value])
		)
	)
}

// Only a body schema reads the body, and its fields mark what's secret.
const redactBody = (bodySchema: GenericSchema | undefined, body: string | undefined) => {
	if (!bodySchema || !body) {
		return undefined
	}

	try {
		return JSON.stringify(applyRedaction(bodySchema, JSON.parse(body)))
	} catch {
		// A body that isn't json could hold anything.
		return REDACTED
	}
}

const redactQuery = (query: URLSearchParams) => {
	const redacted = new URLSearchParams(query)

	for (const name of new Set(query.keys())) {
		if (isSecretField(name)) {
			redacted.set(name, REDACTED)
		}
	}

	return redacted.toString()
}

// A secret path parameter is a segment of the path too, encoded or not.
const redactPath = (pathname: string, secretValues: string[]) => {
	const secretSegments = new Set(secretValues.flatMap(value => [value, encodeURIComponent(value)]))

	return pathname
		.split('/')
		.map(segment => (secretSegments.has(segment) ? REDACTED : segment))
		.join('/')
}

/** The route's input as an error logs it, without credentials or personal data (exported for its tests). */
export const redactRouteInput = (props: RouteSchemaProps) => (input: unknown) => {
	const { request, params, body } = input as RouteInput
	const url = new URL(request.url)
	const secretParams = Object.entries(params).filter(([name]) => isSecretField(name))

	return {
		method: request.method,
		path: redactPath(
			url.pathname,
			secretParams.map(([, value]) => value)
		),
		query: redactQuery(url.searchParams),
		headers: redactHeaders(Object.fromEntries(request.headers)),
		params: { ...params, ...Object.fromEntries(secretParams.map(([name]) => [name, REDACTED])) },
		// A body the route never read stays unread.
		body: redactBody(props.body, body),
		ip: REDACTED,
	}
}

const routeSchema = (props: RouteSchemaProps) => {
	return pipe(
		object({
			request: custom<Request>(value => value instanceof Request),
			params: props.params ?? record(string(), string()),
			query: props.query ?? record(string(), string()),
			body: props.body ? json(props.body) : optional(string()),
			ip: string(),
		}),
		redactWith(redactRouteInput(props))
	)
}

// Router routes deliver params as x-param-* headers. The deployed router
// encodes each value, so it round-trips any character.
const getRouteParams = (headers: Headers) => {
	const params: Record<string, string> = {}

	headers.forEach((value, name) => {
		if (name.startsWith('x-param-')) {
			params[name.slice('x-param-'.length)] = decodeURIComponent(value)
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

const createRouteRunner = <P extends RouteSchemaProps>(props: P, handle: RouteHandler<P>) => {
	const schema = routeSchema(props)

	return async (call: RouteCall, lambdaContext?: LambdaContext): Promise<Response> => {
		const { request } = call
		const url = new URL(request.url)
		const input: RouteInput = {
			request,
			params: call.params ?? getRouteParams(request.headers),
			query: getQuery(url),
			// A body schema reads a copy of the body, so the handler can still read it.
			body: props.body ? await request.clone().text() : undefined,
			ip: call.ip,
		}

		// Unexpected errors carry the redacted input, so the error log has it.
		const toLoggedError = (error: unknown) => enhanceError(error, schema, input, lambdaContext)

		// The handler's async context, for reading a streamed body.
		let runInContext: RunInContext = callback => callback()

		const invocation = await runInvocation({
			schema,
			input,
			raw: call.raw,
			context: lambdaContext,
			handle: async (parsed, context) => {
				const { params, query, body, ip } = parsed as RouteInput
				const response = await handle(
					{
						request,
						url,
						params: params as RouteEvent<P>['params'],
						query: query as RouteEvent<P>['query'],
						data: body as RouteEvent<P>['data'],
						ip,
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

export function route(handle: RouteHandler<{}>): RouteEntry
export function route<P extends RouteSchemaProps>(props: P, handle: RouteHandler<P>): RouteEntry
export function route(
	arg1: RouteSchemaProps | RouteHandler<RouteSchemaProps>,
	arg2?: RouteHandler<RouteSchemaProps>
): RouteEntry {
	const props = arg2 ? (arg1 as RouteSchemaProps) : {}
	const runRoute = createRouteRunner(props, arg2 ?? (arg1 as RouteHandler<RouteSchemaProps>))

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

/** A site ssr handler: a route without schemas. */
export const site = (handle: RouteHandler<{}>): RouteEntry => {
	return route(handle)
}
