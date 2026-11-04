import { randomUUID } from 'crypto'
import { STATUS_CODES } from 'http'
import type { ALBEvent, ALBResult, LambdaFunctionURLEvent } from 'aws-lambda'

// Router paths that need CloudFront's own headers reach the bundle through a
// load balancer, so its events are turned into the function url event the
// route handlers already take, and their results back into its response.

export const isAlbEvent = (event: unknown): event is ALBEvent => {
	return typeof (event as ALBEvent | undefined)?.requestContext?.elb === 'object'
}

// The load balancer passes query params as they came in, still encoded.
const decode = (value: string) => {
	try {
		return decodeURIComponent(value.replace(/\+/g, ' '))
	} catch {
		return value
	}
}

const toLists = (single?: Record<string, string | undefined>, multi?: Record<string, string[] | undefined>) => {
	const lists: Record<string, string[]> = {}

	if (multi) {
		for (const [name, values] of Object.entries(multi)) {
			lists[name] = values ?? []
		}
	} else if (single) {
		for (const [name, value] of Object.entries(single)) {
			lists[name] = typeof value === 'string' ? [value] : []
		}
	}

	return lists
}

export const fromAlbEvent = (event: ALBEvent): LambdaFunctionURLEvent => {
	const headers: Record<string, string> = {}

	for (const [name, values] of Object.entries(toLists(event.headers, event.multiValueHeaders))) {
		const key = name.toLowerCase()

		if (values.length > 0) {
			headers[key] = [...(headers[key] ? [headers[key]] : []), ...values].join(key === 'cookie' ? '; ' : ', ')
		}
	}

	// No origin signing claims the authorization header on this path, so the
	// viewer's own one is used & the tunnelled copy never overrides it.
	delete headers['x-awsless-authorization']

	// The viewer always reaches CloudFront over https; only the hop from
	// CloudFront to the load balancer is plain http.
	headers['x-forwarded-proto'] = 'https'
	headers['x-forwarded-port'] = '443'

	const pairs: string[] = []
	const queryStringParameters: Record<string, string> = {}

	for (const [name, values] of Object.entries(
		toLists(event.queryStringParameters, event.multiValueQueryStringParameters)
	)) {
		for (const value of values) {
			pairs.push(value === '' ? name : `${name}=${value}`)
		}

		queryStringParameters[decode(name)] = values.map(decode).join(',')
	}

	// The load balancer appends the address that connected to it, CloudFront's
	// edge, like a function url's source ip behind the router.
	const forwarded = (headers['x-forwarded-for'] ?? '')
		.split(',')
		.map(entry => entry.trim())
		.filter(Boolean)

	const now = new Date()
	const host = headers.host ?? ''
	const cookies = headers.cookie
		?.split(';')
		.map(cookie => cookie.trim())
		.filter(Boolean)

	return {
		version: '2.0',
		routeKey: '$default',
		rawPath: event.path,
		rawQueryString: pairs.join('&'),
		cookies: cookies && cookies.length > 0 ? cookies : undefined,
		headers,
		queryStringParameters: Object.keys(queryStringParameters).length > 0 ? queryStringParameters : undefined,
		requestContext: {
			accountId: 'anonymous',
			apiId: 'elb',
			domainName: host,
			domainPrefix: host.split('.')[0] ?? '',
			http: {
				method: event.httpMethod,
				path: event.path,
				protocol: 'HTTP/1.1',
				sourceIp: forwarded.at(-1) ?? '',
				userAgent: headers['user-agent'] ?? '',
			},
			requestId: headers['x-amzn-trace-id'] ?? randomUUID(),
			routeKey: '$default',
			stage: '$default',
			time: now.toISOString(),
			timeEpoch: now.getTime(),
		},
		body: event.body ? event.body : undefined,
		isBase64Encoded: event.body ? event.isBase64Encoded : false,
	}
}

type UrlResult = {
	statusCode: number
	headers?: Record<string, string | number | boolean>
	cookies?: string[]
	body?: string
	isBase64Encoded?: boolean
}

const isUrlResult = (result: unknown): result is UrlResult => {
	return typeof result === 'object' && result !== null && typeof (result as UrlResult).statusCode === 'number'
}

// Mirrors the function url's response rules: a result with a status code is
// the response, anything else a 200 json body. The load balancer wants
// multi value headers back when it sent them.
export const toAlbResult = (result: unknown, multiValueHeaders: boolean): ALBResult => {
	const response: UrlResult = isUrlResult(result)
		? result
		: {
				statusCode: 200,
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(result ?? null),
			}

	const statusCode = response.statusCode
	const statusDescription = `${statusCode} ${STATUS_CODES[statusCode] ?? ''}`.trim()
	const lists: Record<string, string[]> = {}

	for (const [name, value] of Object.entries(response.headers ?? {})) {
		lists[name.toLowerCase()] = [String(value)]
	}

	if (response.cookies && response.cookies.length > 0) {
		lists['set-cookie'] = [...(lists['set-cookie'] ?? []), ...response.cookies]
	}

	const base = {
		statusCode,
		statusDescription,
		body: response.body ?? '',
		isBase64Encoded: response.isBase64Encoded ?? false,
	}

	if (multiValueHeaders) {
		return { ...base, multiValueHeaders: lists }
	}

	// Without multi value headers only one cookie can be set.
	return {
		...base,
		headers: Object.fromEntries(Object.entries(lists).map(([name, values]) => [name, values.at(-1)!])),
	}
}
