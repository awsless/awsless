import { Handler, isErrorResponse, lambda, LambdaContext } from '@awsless/lambda'
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

// Our own request object: the useful parts of the web Request without
// the browser era baggage that makes no sense inside a lambda. The
// body is already fully buffered, so reading it is synchronous.
export class RouteRequest<
	Params = Record<string, string>,
	Query = Record<string, string>,
	Data = unknown,
> {
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

// ------------------------------------------------------------------
// The whole event validates as one schema: the envelope shape first,
// then the extracted params, query & json body against their schemas,
// and the final transform builds the web Request.

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
	// Router routes deliver their params as x-param-* headers, while
	// the rest apis deliver real path parameters - normalize both.
	let params: Record<string, string> = event.pathParameters ?? {}

	if (Object.keys(params).length === 0) {
		for (const [name, value] of Object.entries(event.headers ?? {})) {
			if (name.startsWith('x-param-')) {
				params[name.slice('x-param-'.length)] = value
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
	// Synthetic test events often carry empty domains & paths - fall
	// back so the url always parses.
	const domain = event.requestContext.domainName || 'localhost'
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
	) as RouteSchema<P>
}

// ------------------------------------------------------------------
// Responses

const isTextual = (contentType: string) => {
	return (
		contentType.startsWith('text/') ||
		contentType.includes('json') ||
		contentType.includes('xml') ||
		contentType.includes('javascript') ||
		contentType.includes('x-www-form-urlencoded')
	)
}

// A web Response converts to the lambda url result shape, so handlers
// return standard responses.
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
	const textual = isTextual(headers['content-type'] ?? 'text/plain')

	return {
		statusCode: response.status,
		headers,
		cookies: cookies.length > 0 ? cookies : undefined,
		body: buffer.length > 0 ? (textual ? buffer.toString() : buffer.toString('base64')) : undefined,
		isBase64Encoded: buffer.length > 0 && !textual,
	}
}

// ------------------------------------------------------------------
// Handlers

type LambdaUrlResult = { statusCode: number; [key: string]: unknown }

/** The request a route or site handler receives, validated against the route schemas. */
export type RouteEvent<P extends RouteSchemaProps = {}> = RouteRequestOf<P>

/** What a route or site handler may return: a web Response or a lambda url result object. */
export type RouteResponse = Response | LambdaUrlResult

type RouteResult = RouteResponse | Promise<RouteResponse>

// The inner handler receives the extended lambda context, while the
// outer entrypoint receives the raw aws context.
type HandlerContext = Parameters<Handler>[1]

type RouteHandler<P extends RouteSchemaProps> = (request: RouteRequestOf<P>, context: HandlerContext) => RouteResult
type RouteEntry = (event: unknown, context?: LambdaContext) => Promise<unknown>

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
		const result = await handler(event as EnvelopeInput, context)

		// Validation & unexpected errors render as a json error
		// response instead of a viewable error payload.
		if (isErrorResponse(result)) {
			return {
				statusCode: 500,
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ message: result.__error__.message }),
			}
		}

		return result
	}
}

// Site ssr handlers receive the same request object without any route
// schemas & return either a web Response or the lambda url result.
export const site = <H extends RouteHandler<{}>>(handle: H) => {
	return lambda({
		schema: routeSchema({}),
		handle: async (request, context) => {
			const result = await handle(request, context)

			return result instanceof Response ? toLambdaUrlResult(result) : result
		},
	})
}
