import { ExpectedError, Handler, isErrorResponse, lambda, LambdaContext, ViewableError } from '@awsless/lambda'
import {
	BaseSchema,
	boolean,
	custom,
	GenericIssue,
	GenericSchema,
	InferInput,
	InferOutput,
	json,
	object,
	ObjectEntries,
	ObjectSchema,
	optional,
	picklist,
	pipe,
	record,
	string,
	transform,
	unknown,
} from '@awsless/validate'

export type RouteSchemaProps = {
	/** The schema the json request body validates against - the parsed result lands on `request.data`. */
	body?: GenericSchema

	/** The schema the query string parameters validate against. */
	query?: ObjectSchema<ObjectEntries, undefined> | undefined

	/** The schema the route path parameters validate against. */
	params?: ObjectSchema<ObjectEntries, undefined> | undefined
}

type Op<T extends GenericSchema | undefined, D> = T extends GenericSchema ? InferOutput<T> : D

type Method = 'GET' | 'POST' | 'HEAD' | 'OPTIONS' | 'PUT' | 'PATCH' | 'DELETE'

// The useful parts of the web Request; the body is already buffered,
// so reading it is synchronous.
export class RouteRequest<Params = Record<string, string>, Query = Record<string, string>, Data = unknown> {
	/** The http method of the request. */
	readonly method: Method

	/** The full request url. */
	readonly url: URL

	/** The request headers. */
	readonly headers: Headers

	/** The validated route path parameters. */
	readonly params: Params

	/** The validated query string parameters. */
	readonly query: Query

	/** The parsed & validated request body, when a body schema is given. */
	readonly data: Data

	/** The ip address of the caller. */
	readonly ip: string

	/** The user agent header of the caller. */
	readonly userAgent: string

	/** The raw request body bytes. */
	readonly body?: Buffer

	constructor(props: {
		method: Method
		url: string
		headers: Headers
		params: Params
		query: Query
		data: Data
		ip: string
		userAgent: string
		body?: Buffer
	}) {
		this.method = props.method
		this.url = new URL(props.url)
		this.headers = props.headers
		this.params = props.params
		this.query = props.query
		this.data = props.data
		this.ip = props.ip
		this.userAgent = props.userAgent
		this.body = props.body
	}

	/** The body decoded as text. */
	text() {
		return this.body?.toString()
	}

	/** The body parsed as json. */
	json<T = unknown>(): T {
		return JSON.parse(this.text() ?? 'null') as T
	}
}

// The whole event validates as one schema, ending in the request object.

const envelopeSchema = object({
	rawPath: optional(string()),
	rawQueryString: optional(string()),
	body: optional(string()),
	isBase64Encoded: optional(boolean()),
	headers: optional(record(string(), string())),
	pathParameters: optional(record(string(), string())),
	queryStringParameters: optional(record(string(), string())),
	requestContext: object({
		domainName: string(),
		http: object({
			method: picklist(['GET', 'POST', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'DELETE']),
			path: string(),
			sourceIp: string(),
			userAgent: string(),
		}),
	}),
})

type EnvelopeInput = InferInput<typeof envelopeSchema>
type EnvelopeEvent = InferOutput<typeof envelopeSchema>

type Extracted = {
	event: EnvelopeEvent
	params: Record<string, string>
	query: Record<string, string>
	body: string | undefined
}

type Parts<P extends RouteSchemaProps> = {
	event: EnvelopeEvent
	params: Op<P['params'], Record<string, string>>
	query: Op<P['query'], Record<string, string>>
	body: Op<P['body'], string | undefined>
}

type RouteRequestOf<P extends RouteSchemaProps> = RouteRequest<
	Op<P['params'], Record<string, string>>,
	Op<P['query'], Record<string, string>>,
	Op<P['body'], undefined>
>

export type RouteSchema<P extends RouteSchemaProps> = BaseSchema<EnvelopeInput, RouteRequestOf<P>, GenericIssue>

const extractParts = (event: EnvelopeEvent): Extracted => {
	// Router routes deliver params as x-param-* headers, rest apis as path parameters.
	let params: Record<string, string> = event.pathParameters ?? {}

	if (Object.keys(params).length === 0) {
		for (const [name, value] of Object.entries(event.headers ?? {})) {
			if (name.startsWith('x-param-')) {
				// The deployed router encodes the param value into the
				// header, so it round-trips any character - decode it back.
				params[name.slice('x-param-'.length)] = decodeURIComponent(value)
			}
		}
	}

	let query: Record<string, string> = event.queryStringParameters ?? {}

	if (Object.keys(query).length === 0 && event.rawQueryString) {
		query = Object.fromEntries(new URLSearchParams(event.rawQueryString))
	}

	const body =
		typeof event.body === 'string'
			? event.isBase64Encoded
				? Buffer.from(event.body, 'base64').toString()
				: event.body
			: undefined

	return { event, params, query, body }
}

// Valibot can't express conditionally typed object entries, so the
// parts schema declares its exact input & output shape itself.
const partsSchema = <P extends RouteSchemaProps>(props: P) => {
	return object({
		event: custom<EnvelopeEvent>(() => true),
		params: props.params ?? optional(unknown()),
		query: props.query ?? optional(unknown()),
		body: props.body ? json(props.body) : optional(unknown()),
	}) as GenericSchema<Extracted, Parts<P>>
}

const buildRequest = <P extends RouteSchemaProps>(props: P, parts: Parts<P>): RouteRequestOf<P> => {
	const { event, params, query, body } = parts
	const headers = new Headers()

	for (const [name, value] of Object.entries(event.headers ?? {})) {
		headers.set(name, value)
	}

	const method = event.requestContext.http.method
	// The forwarded host is the domain the caller used; synthetic test
	// events may carry none, so the url must still parse.
	const domain = headers.get('x-forwarded-host') || event.requestContext.domainName || 'localhost'
	const path = event.rawPath || event.requestContext.http.path || '/'
	const protocol = headers.get('x-forwarded-proto') ?? 'https'
	const url = `${protocol}://${domain}${path}${event.rawQueryString ? `?${event.rawQueryString}` : ''}`

	const rawBody =
		typeof event.body === 'undefined'
			? undefined
			: event.isBase64Encoded
				? Buffer.from(event.body, 'base64')
				: Buffer.from(event.body)

	// Without a body schema the data stays undefined - the conditional
	// prop type can't narrow on the runtime check.
	const data = (props.body ? body : undefined) as Op<P['body'], undefined>

	return new RouteRequest({
		method,
		url,
		headers,
		params,
		query,
		data,
		ip: event.requestContext.http.sourceIp,
		userAgent: event.requestContext.http.userAgent,
		body: rawBody,
	})
}

const routeSchema = <P extends RouteSchemaProps>(props: P): RouteSchema<P> => {
	return pipe(
		envelopeSchema,
		transform(extractParts),
		partsSchema(props),
		transform((parts: Parts<P>) => buildRequest(props, parts))
	)
}

const isTextual = (contentType: string) => {
	return (
		contentType.startsWith('text/') ||
		contentType.includes('json') ||
		contentType.includes('xml') ||
		contentType.includes('javascript') ||
		contentType.includes('x-www-form-urlencoded')
	)
}

// Handlers return standard web Responses.
const toLambdaUrlResult = async (response: Response) => {
	const headers: Record<string, string> = {}
	const cookies: string[] = []

	response.headers.forEach((value, name) => {
		if (name.toLowerCase() === 'set-cookie') {
			cookies.push(value)
		} else {
			headers[name] = value
		}
	})

	const buffer = Buffer.from(await response.arrayBuffer())

	// A Response over raw bytes has no content type, and decoding
	// unknown bytes as utf-8 would corrupt them.
	const contentType = headers['content-type']
	const textual = typeof contentType === 'string' && isTextual(contentType)

	return {
		statusCode: response.status,
		headers,
		cookies: cookies.length > 0 ? cookies : undefined,
		body: buffer.length > 0 ? (textual ? buffer.toString() : buffer.toString('base64')) : undefined,
		isBase64Encoded: buffer.length > 0 && !textual,
	}
}

/** The request a route or site handler receives, validated against the route schemas. */
export type RouteEvent<P extends RouteSchemaProps = {}> = RouteRequestOf<P>

/** What a route or site handler may return: a web Response or a lambda url result object. */
export type RouteResponse = Response | RouteEntryResult

type RouteResult = RouteResponse | Promise<RouteResponse>

/** The lambda url result a route entry resolves to - a returned web Response converts into this shape. */
export type RouteEntryResult = {
	statusCode: number
	headers?: Record<string, string>
	cookies?: string[]
	body?: string
	isBase64Encoded?: boolean
	[key: string]: unknown
}

// The inner handler receives the extended lambda context, while the
// outer entrypoint receives the raw aws context.
type HandlerContext = Parameters<Handler>[1]

type RouteHandler<P extends RouteSchemaProps> = (request: RouteRequestOf<P>, context: HandlerContext) => RouteResult
type RouteEntry = (event: unknown, context?: LambdaContext) => Promise<RouteEntryResult>

export function route<H extends RouteHandler<{}>>(handle: H): RouteEntry
export function route<P extends RouteSchemaProps>(props: P, handle: RouteHandler<P>): RouteEntry
export function route(
	arg1: RouteSchemaProps | RouteHandler<RouteSchemaProps>,
	arg2?: RouteHandler<RouteSchemaProps>
): RouteEntry {
	const props = arg2 ? (arg1 as RouteSchemaProps) : {}
	const handle = arg2 ?? (arg1 as RouteHandler<RouteSchemaProps>)

	const handler = lambda({
		schema: routeSchema(props),
		handle: async (request, context) => {
			const result = await handle(request, context)

			return result instanceof Response ? toLambdaUrlResult(result) : result
		},
	})

	return async (event, context) => {
		let result: Awaited<ReturnType<typeof handler>>

		try {
			result = await handler(event as EnvelopeInput, context)
		} catch (error) {
			// Test mode throws expected errors instead of returning them;
			// the route contract is http, so they still render as a response.
			if (error instanceof ExpectedError || error instanceof ViewableError) {
				return jsonErrorResponse(error)
			}

			throw error
		}

		if (isErrorResponse(result)) {
			return jsonErrorResponse(result.__error__)
		}

		return result
	}
}

// Bad input is a 400, any other expected error a 500. Unexpected errors
// propagate, so the on-error-log consumer sees them.
const jsonErrorResponse = (error: { type: string; message: string; data?: unknown }) => {
	return {
		statusCode: error.type === 'validation' ? 400 : 500,
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ type: error.type, message: error.message, data: error.data }),
	}
}

// A site ssr handler is a schema-less route: an expected error must
// never serialize as a 200 error payload.
export const site = <H extends RouteHandler<{}>>(handle: H): RouteEntry => {
	return route(handle)
}
