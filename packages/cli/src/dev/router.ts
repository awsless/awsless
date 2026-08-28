import { randomUUID } from 'crypto'
import { ServerResponse } from 'http'
import { DevDispatch, DevRoute } from '../feature.js'
import { ROUTE_HEADER } from '../feature/bundle/util.js'
import { compileRoutePattern } from '../feature/router/pattern.js'
import { parseTraceHeader, TRACE_HEADER } from './util.js'

type CompiledRoute = {
	match?: RegExp
	params?: string[]
	routeKey?: string
	proxy?: string
	rewrite?: { regex: string; to: string }
}

type RouteMatch = {
	routeKey?: string
	proxy?: string
	params: Record<string, string>
	rewrite?: { regex: string; to: string }
}

// The local router mirrors the CloudFront viewer request function: the
// route store only holds the exact path, the first path segment
// wildcard (/root/*) & the catch-all (/*), with an optional regex for
// patterns that are more specific than their store key.
const compileRoutes = (routes: DevRoute[]) => {
	const store = new Map<string, CompiledRoute[]>()

	for (const route of routes) {
		// Raw keys (like the dotted asset wildcards of a site) go into
		// the store verbatim, exactly like the deployed route store.
		const compiled = route.rawKey ? { key: route.pattern } : compileRoutePattern(route.pattern)
		const list = store.get(compiled.key) ?? []

		list.push({
			match: 'match' in compiled && compiled.match ? new RegExp(compiled.match) : undefined,
			params: 'params' in compiled ? compiled.params : undefined,
			routeKey: route.routeKey,
			proxy: route.proxy,
			rewrite: route.rewrite,
		})

		store.set(compiled.key, list)
	}

	// Regex routes match in order of definition, with the plain
	// wildcard route last.
	for (const list of store.values()) {
		list.sort((a, b) => Number(!a.match) - Number(!b.match))
	}

	// The same key lookup order as the deployed viewer request function,
	// including the dotted file wildcards sites use for their assets.
	const possibleKeys = (path: string) => {
		if (path === '' || path === '/') {
			return ['/', '/*']
		}

		const parts = path.split('/')
		const root = path.startsWith('/') ? parts[1]! : parts[0]!
		const file = parts[parts.length - 1]!.includes('.')

		if (root.includes('.')) {
			return [path, '/*.', '/*']
		}

		if (file) {
			return [path, `/${root}/*.`, `/${root}/*`, '/*.', '/*']
		}

		return [path, `/${root}/*`, '/*']
	}

	return (path: string): RouteMatch | undefined => {
		for (const key of possibleKeys(path)) {
			for (const route of store.get(key) ?? []) {
				if (!route.match) {
					return { routeKey: route.routeKey, proxy: route.proxy, params: {}, rewrite: route.rewrite }
				}

				const result = route.match.exec(path)

				if (result) {
					const params: Record<string, string> = {}

					route.params?.forEach((name, index) => {
						params[name] = result[index + 1]!
					})

					return { routeKey: route.routeKey, proxy: route.proxy, params, rewrite: route.rewrite }
				}
			}
		}

		return undefined
	}
}

// Lambda function urls pass textual bodies through as plain text and
// only base64 encode binary payloads.
const isTextualBody = (contentType: string) => {
	return (
		contentType.startsWith('text/') ||
		contentType.includes('json') ||
		contentType.includes('xml') ||
		contentType.includes('javascript') ||
		contentType.includes('x-www-form-urlencoded')
	)
}

const formatWebEvent = (request: Request, route: RouteMatch, body: Buffer, url: URL, sourceIp: string) => {
	// Apply the route's origin path rewrite, like the deployed router.
	const path = route.rewrite ? url.pathname.replace(new RegExp(route.rewrite.regex), route.rewrite.to) : url.pathname

	const headers: Record<string, string> = {}

	for (const [name, value] of request.headers) {
		headers[name] = value
	}

	// The client can never hijack the routing.
	headers[ROUTE_HEADER] = route.routeKey!

	// CloudFront fronts every deployed router & the runtime reads its
	// viewer headers, so the local router synthesizes the essentials.
	headers['cloudfront-viewer-address'] ??= `${sourceIp}:0`
	headers['cloudfront-viewer-country'] ??= 'US'

	// Param values are passed to the function as request headers.
	for (const [name, value] of Object.entries(route.params)) {
		headers[`x-param-${name.toLowerCase()}`] = value
	}

	const queryStringParameters: Record<string, string> = {}
	for (const [name, value] of url.searchParams) {
		queryStringParameters[name] = value
	}

	const cookie = request.headers.get('cookie')

	// Only a present textual content type marks the body as text - and only
	// when the bytes survive a utf-8 round trip: some clients post binary
	// payloads under a textual content type & those must pass as base64
	// instead of corrupting through the decode.
	const contentType = request.headers.get('content-type')
	const textual =
		typeof contentType === 'string' && isTextualBody(contentType) && Buffer.from(body.toString()).equals(body)
	const now = new Date()

	return {
		version: '2.0',
		routeKey: '$default',
		rawPath: path,
		rawQueryString: url.search.slice(1),
		cookies: cookie ? cookie.split(';').map(v => v.trim()) : undefined,
		headers,
		queryStringParameters,
		requestContext: {
			accountId: 'anonymous',
			apiId: 'local',
			domainName: url.hostname,
			domainPrefix: url.hostname.split('.')[0],
			http: {
				method: request.method,
				path,
				protocol: 'HTTP/1.1',
				sourceIp,
				userAgent: headers['user-agent'] ?? '',
			},
			requestId: randomUUID(),
			routeKey: '$default',
			stage: '$default',
			time: now.toISOString(),
			timeEpoch: now.getTime(),
		},
		body: body.length > 0 ? (textual ? body.toString() : body.toString('base64')) : undefined,
		isBase64Encoded: body.length > 0 && !textual,
	}
}

type StructuredResult = {
	statusCode: number
	headers?: Record<string, string>
	cookies?: string[]
	body?: string
	isBase64Encoded?: boolean
}

const isStructured = (result: unknown): result is StructuredResult => {
	return typeof result === 'object' && result !== null && typeof (result as StructuredResult).statusCode === 'number'
}

// Mirror the lambda function url response semantics: a structured
// response is written as-is & everything else becomes a 200 json
// response.
const toResponse = (result: unknown) => {
	if (isStructured(result)) {
		const headers = new Headers(result.headers ?? {})

		for (const cookie of result.cookies ?? []) {
			headers.append('set-cookie', cookie)
		}

		const body =
			typeof result.body === 'string'
				? result.isBase64Encoded
					? Buffer.from(result.body, 'base64')
					: result.body
				: null

		return new Response(body, { status: result.statusCode, headers })
	}

	return Response.json(result ?? null)
}

// The node http server still uses this shape for the rest emulator.
export const writeWebResponse = (res: ServerResponse, result: unknown) => {
	if (isStructured(result)) {
		const headers: Record<string, string | string[]> = { ...result.headers }

		if (result.cookies && result.cookies.length > 0) {
			headers['set-cookie'] = result.cookies
		}

		res.writeHead(result.statusCode, headers)
		res.end(
			typeof result.body === 'string'
				? result.isBase64Encoded
					? Buffer.from(result.body, 'base64')
					: result.body
				: undefined
		)

		return
	}

	res.writeHead(200, { 'content-type': 'application/json' })
	res.end(JSON.stringify(result ?? null))
}

type SocketData = {
	upstream: WebSocket
	buffer: (string | Uint8Array)[]
}

// The local router runs on Bun.serve, since the cli always runs under
// bun & the node http server can't hand off websocket upgrades.
export const startDevRouter = async (props: {
	routes: DevRoute[]
	port: number
	dispatch: DevDispatch
	// Handler errors surface here, so they reach the terminal & the
	// dashboard's worker log instead of vanishing into a bare 500.
	onError?: (error: unknown, routeKey: string) => void
}) => {
	const match = compileRoutes(props.routes)

	const rewrittenPath = (route: RouteMatch, path: string) => {
		return route.rewrite ? path.replace(new RegExp(route.rewrite.regex), route.rewrite.to) : path
	}

	const server = Bun.serve<SocketData>({
		port: props.port,
		// Loopback only, like every other local server - the router
		// carries the whole app & must never listen on the lan.
		hostname: '127.0.0.1',
		idleTimeout: 120,
		async fetch(request, server) {
			const url = new URL(request.url)
			const route = match(url.pathname)

			if (!route) {
				return new Response(`No route matched: ${url.pathname}`, { status: 404 })
			}

			// Proxy routes stream straight to their local target server,
			// like the url origins of the deployed router.
			if (route.proxy) {
				const target = new URL(route.proxy)
				const path = rewrittenPath(route, url.pathname) + url.search

				if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
					// Forward the requested subprotocols & echo the first one
					// back, like vite's "vite-hmr" handshake requires.
					const protocols = request.headers
						.get('sec-websocket-protocol')
						?.split(',')
						.map(value => value.trim())

					const upstream = new WebSocket(`ws://${target.host}${path}`, protocols)
					const data: SocketData = { upstream, buffer: [] }

					// Client messages queue until the upstream is open.
					upstream.addEventListener('open', () => {
						for (const message of data.buffer) {
							upstream.send(message as string | BufferSource)
						}

						data.buffer = []
					})

					const upgraded = server.upgrade(request, {
						data,
						headers: protocols ? { 'sec-websocket-protocol': protocols[0]! } : undefined,
					})

					if (upgraded) {
						return
					}

					upstream.close()

					return new Response('Upgrade failed', { status: 400 })
				}

				const proxied = await fetch(`http://${target.host}${path}`, {
					method: request.method,
					headers: request.headers,
					body: request.body,
					redirect: 'manual',
				})

				return new Response(proxied.body, {
					status: proxied.status,
					// Status texts carry meaning for dev servers, like
					// vite's "Outdated Optimize Dep" on a 504.
					statusText: proxied.statusText,
					headers: proxied.headers,
				})
			}

			if (!route.routeKey) {
				return new Response(`No route matched: ${url.pathname}`, { status: 404 })
			}

			const body = Buffer.from(await request.arrayBuffer())
			const sourceIp = server.requestIP(request)?.address ?? '127.0.0.1'

			let result: unknown

			try {
				// A browser request starts a fresh trace - but a handler
				// fetching its own router (like an ssr page calling an rpc)
				// carries the trace header & stays inside its caller's trace.
				result = await props.dispatch(
					formatWebEvent(request, route, body, url, sourceIp),
					parseTraceHeader(request.headers.get(TRACE_HEADER))
				)
			} catch (error) {
				props.onError?.(error, route.routeKey)

				// The local 500 carries the real error, so a failing page
				// or api call is debuggable straight from the browser.
				const detail = error instanceof Error ? (error.stack ?? error.message) : String(error)

				return new Response(`500: Internal Error\n\n${route.routeKey}\n${detail}`, {
					status: 500,
					headers: { 'content-type': 'text/plain' },
				})
			}

			return toResponse(result)
		},
		websocket: {
			open(ws) {
				const upstream = ws.data.upstream

				upstream.addEventListener('message', event => {
					ws.send(event.data as string | Uint8Array)
				})

				upstream.addEventListener('close', () => ws.close())
				upstream.addEventListener('error', () => ws.close())
			},
			message(ws, message) {
				const upstream = ws.data.upstream

				if (upstream.readyState === WebSocket.OPEN) {
					upstream.send(message)
				} else {
					ws.data.buffer.push(message)
				}
			},
			close(ws) {
				ws.data.upstream.close()
			},
		},
	})

	return {
		// Bun never resolves stop() once the server closed a socket
		// itself, like when a proxied upstream dies. The port frees
		// either way, so waiting only hangs the shutdown.
		stop: async () => {
			void server.stop(true)
		},
	}
}
