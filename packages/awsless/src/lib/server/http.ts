import { array, boolean, object, optional, parse, picklist, record, string } from '@awsless/validate'

// A route's handler takes a web Request. Called with a function url (or http
// api) event instead, as a lambda of its own or a rest api's route is, these
// turn the event into one and the Response back, with the function url's rules.

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

/** The caller behind CloudFront: its viewer address ("ip:port", also for ipv6), which CloudFront writes over any a client sends. */
export const getViewerIp = (headers: Headers) => {
	const address = headers.get('cloudfront-viewer-address')

	if (!address) {
		return undefined
	}

	const portSeparator = address.lastIndexOf(':')

	return portSeparator === -1 ? address : address.slice(0, portSeparator)
}
