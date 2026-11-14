import { randomUUID } from 'node:crypto'
import { array, boolean, object, optional, parse, picklist, record, string } from '@awsless/validate'

// A request reaches a handler in one of two shapes: a function url (or http
// api) event, read whole, or a web Request on the web function. These
// turn one into the other, and the answers back, with the function url's rules.

// A function url hands these bodies over as text and every other one in base64.
const isTextContentType = (contentType: string | null | undefined) => {
	const type = contentType?.split(';')[0]?.trim().toLowerCase() ?? ''

	return (
		type.startsWith('text/') ||
		type.endsWith('+json') ||
		type.endsWith('+xml') ||
		[
			'application/json',
			'application/javascript',
			'application/xml',
			'application/x-www-form-urlencoded',
			'application/graphql',
		].includes(type)
	)
}

const functionUrlEventSchema = object({
	rawPath: optional(string()),
	rawQueryString: optional(string()),
	body: optional(string()),
	isBase64Encoded: optional(boolean()),
	headers: optional(record(string(), string())),
	cookies: optional(array(string())),
	pathParameters: optional(record(string(), string())),
	requestContext: object({
		domainName: optional(string()),
		requestId: optional(string()),
		http: object({
			method: picklist(['GET', 'POST', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'DELETE']),
			path: optional(string()),
			sourceIp: string(),
			userAgent: optional(string()),
		}),
	}),
})

/** A function url or http api event, the fields read here. */
export type FunctionUrlEvent = {
	version?: string
	routeKey?: string
	rawPath?: string
	rawQueryString?: string
	body?: string
	isBase64Encoded?: boolean
	headers?: Record<string, string>
	cookies?: string[]
	pathParameters?: Record<string, string>
	requestContext: {
		domainName?: string
		requestId?: string
		http: { method: string; path?: string; sourceIp: string; userAgent?: string; protocol?: string }
		[key: string]: unknown
	}
	[key: string]: unknown
}

/** What a handler answers through a function url. */
export type FunctionUrlResult = {
	statusCode: number
	headers?: Record<string, string>
	cookies?: string[]
	body?: string
	isBase64Encoded?: boolean
}

/**
 * A function url or http api event as a web Request, with what only the
 * event knows: the lambda's source ip and a rest api's path parameters.
 */
export const toWebRequest = (input: unknown) => {
	const event = parse(functionUrlEventSchema, input)
	const headers = new Headers()

	for (const [name, value] of Object.entries(event.headers ?? {})) {
		headers.set(name, value)
	}

	// A function url hands the cookies over apart from the headers.
	if (event.cookies?.length && !headers.has('cookie')) {
		headers.set('cookie', event.cookies.join('; '))
	}

	const method = event.requestContext.http.method

	// The forwarded host is the domain the caller used; synthetic test
	// events may carry none, so the url must still parse.
	const domain = headers.get('x-forwarded-host') || event.requestContext.domainName || 'localhost'
	const url = new URL(`${headers.get('x-forwarded-proto') ?? 'https'}://${domain}`)

	url.pathname = event.rawPath || event.requestContext.http.path || '/'
	url.search = event.rawQueryString ?? ''
	const hasBody = typeof event.body === 'string' && method !== 'GET' && method !== 'HEAD'

	return {
		request: new Request(url, {
			method,
			headers,
			body: hasBody ? Buffer.from(event.body!, event.isBase64Encoded ? 'base64' : 'utf8') : undefined,
		}),
		sourceIp: event.requestContext.http.sourceIp,
		pathParameters: event.pathParameters,
	}
}

/** A web Request as the function url event a handler without a web entry takes, its body read whole. */
export const toFunctionUrlEvent = async (
	request: Request,
	props: { sourceIp?: string } = {}
): Promise<FunctionUrlEvent> => {
	const headers = Object.fromEntries(request.headers)
	const url = new URL(request.url)
	const query = getQuery(url)
	const body = Buffer.from(await request.arrayBuffer())

	// A textual body that isn't valid utf-8 passes as base64, so it can't corrupt.
	const isText = isTextContentType(headers['content-type']) && Buffer.from(body.toString()).equals(body)
	const cookies = headers.cookie
		?.split(';')
		.map(cookie => cookie.trim())
		.filter(Boolean)
	const now = new Date()

	return {
		version: '2.0',
		routeKey: '$default',
		rawPath: url.pathname,
		rawQueryString: url.search.slice(1),
		cookies: cookies && cookies.length > 0 ? cookies : undefined,
		headers,
		queryStringParameters: Object.keys(query).length > 0 ? query : undefined,
		requestContext: {
			accountId: 'anonymous',
			apiId: 'web',
			domainName: url.host,
			domainPrefix: url.host.split('.')[0] ?? '',
			http: {
				method: request.method,
				path: url.pathname,
				protocol: 'HTTP/1.1',
				sourceIp: props.sourceIp ?? '',
				userAgent: headers['user-agent'] ?? '',
			},
			requestId: randomUUID(),
			routeKey: '$default',
			stage: '$default',
			time: now.toISOString(),
			timeEpoch: now.getTime(),
		},
		body: body.byteLength > 0 ? body.toString(isText ? 'utf8' : 'base64') : undefined,
		isBase64Encoded: body.byteLength > 0 && !isText,
	}
}

const isFunctionUrlResult = (result: unknown): result is FunctionUrlResult => {
	return typeof result === 'object' && result !== null && typeof (result as FunctionUrlResult).statusCode === 'number'
}

// Statuses whose response can't have a body.
const NULL_BODY_STATUSES = [101, 103, 204, 205, 304]

/** A handler's answer as a web Response: a result with a status code is the response, anything else a 200 json body. */
export const toWebResponse = (result: unknown) => {
	if (!isFunctionUrlResult(result)) {
		return Response.json(result ?? null)
	}

	const headers = new Headers()

	for (const [name, value] of Object.entries(result.headers ?? {})) {
		headers.set(name, value)
	}

	for (const cookie of result.cookies ?? []) {
		headers.append('set-cookie', cookie)
	}

	const hasBody = typeof result.body === 'string' && !NULL_BODY_STATUSES.includes(result.statusCode)
	const body = hasBody ? Buffer.from(result.body!, result.isBase64Encoded ? 'base64' : 'utf8') : null

	return new Response(body, { status: result.statusCode, headers })
}

/** A web Response read to its end, as the result a function url answers. */
export const toFunctionUrlResult = async (response: Response): Promise<FunctionUrlResult> => {
	const headers: Record<string, string> = {}

	response.headers.forEach((value, name) => {
		if (name !== 'set-cookie') {
			headers[name] = value
		}
	})

	const cookies = response.headers.getSetCookie()
	const body = Buffer.from(await response.arrayBuffer())

	// A Response over raw bytes has no content type, and decoding
	// unknown bytes as utf-8 would corrupt them.
	const isText = isTextContentType(headers['content-type'])

	return {
		statusCode: response.status,
		headers,
		cookies: cookies.length > 0 ? cookies : undefined,
		body: body.byteLength > 0 ? body.toString(isText ? 'utf8' : 'base64') : undefined,
		isBase64Encoded: body.byteLength > 0 && !isText,
	}
}

/** A url's query, a repeated name's values joined with commas like a function url's. */
export const getQuery = (url: URL) => {
	const query: Record<string, string> = {}

	for (const name of new Set(url.searchParams.keys())) {
		query[name] = url.searchParams.getAll(name).join(',')
	}

	return query
}

/** The caller behind CloudFront: its viewer address ("ip:port", also for ipv6), which CloudFront writes over any a client sends. */
export const getViewerIp = (headers: Headers) => {
	const address = headers.get('cloudfront-viewer-address')

	if (!address) {
		return undefined
	}

	const portSeparator = address.lastIndexOf(':')

	return portSeparator === -1 ? address : address.slice(0, portSeparator)
}
