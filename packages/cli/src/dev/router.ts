import { toFunctionUrlEvent, toWebResponse } from 'awsless'
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
	// Raw keys are the static asset routes, which the deployed viewer
	// only serves for GET & HEAD (they are s3 origins).
	readOnly: boolean
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
export const compileRoutes = (routes: DevRoute[]) => {
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
			readOnly: Boolean(route.rawKey),
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

	return (requestPath: string, method = 'GET'): RouteMatch | undefined => {
		// Only the route selection drops a trailing slash, like the viewer
		// function - the forwarded path stays untouched.
		const path = requestPath.length > 1 && requestPath.endsWith('/') ? requestPath.slice(0, -1) : requestPath

		for (const key of possibleKeys(path)) {
			for (const route of store.get(key) ?? []) {
				if (route.readOnly && method !== 'GET' && method !== 'HEAD') {
					continue
				}

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

// Apply the route's origin path rewrite, like the deployed router.
const rewrittenPath = (route: RouteMatch, path: string) => {
	return route.rewrite ? path.replace(new RegExp(route.rewrite.regex), route.rewrite.to) : path
}

// The request as the deployed router hands it to its origin: the route's
// rewritten path and handler, its params as headers, and CloudFront's viewer
// headers, which CloudFront writes over a client's (exported for its tests).
export const createRoutedRequest = (request: Request, route: RouteMatch, url: URL, sourceIp: string) => {
	const headers = new Headers(request.headers)

	// The client can never hijack the routing.
	headers.set(ROUTE_HEADER, route.routeKey!)
	headers.set('cloudfront-viewer-address', `${sourceIp}:0`)

	if (!headers.has('cloudfront-viewer-country')) {
		headers.set('cloudfront-viewer-country', 'US')
	}

	for (const [name, value] of Object.entries(route.params)) {
		headers.set(`x-param-${name.toLowerCase()}`, value)
	}

	const routedUrl = new URL(url)
	routedUrl.pathname = rewrittenPath(route, url.pathname)

	return new Request(routedUrl, {
		method: request.method,
		headers,
		body: request.body,
		duplex: 'half',
	} as RequestInit)
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
	// Opt-in lan exposure, for testing the site on a phone.
	host?: boolean
	dispatch: DevDispatch
	// Handler errors surface here, so they reach the terminal & the
	// dashboard's worker log instead of vanishing into a bare 500.
	onError?: (error: unknown, routeKey: string) => void
}) => {
	const match = compileRoutes(props.routes)

	const server = Bun.serve<SocketData>({
		port: props.port,
		// Loopback by default, like every other local server - the
		// router carries the whole app, so the lan is opt-in only.
		hostname: props.host ? '0.0.0.0' : '127.0.0.1',
		idleTimeout: 120,
		async fetch(request, server) {
			const url = new URL(request.url)
			const route = match(url.pathname, request.method)

			if (!route) {
				return new Response(null, { status: 404 })
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
				return new Response(null, { status: 404 })
			}

			const sourceIp = server.requestIP(request)?.address ?? '127.0.0.1'

			let result: unknown

			try {
				// A browser request starts a fresh trace - but a handler
				// fetching its own router (like an ssr page calling an rpc)
				// carries the trace header & stays inside its caller's trace.
				result = await props.dispatch(
					await toFunctionUrlEvent(createRoutedRequest(request, route, url, sourceIp), { sourceIp }),
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

			return toWebResponse(result)
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
