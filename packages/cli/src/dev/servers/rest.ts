import { randomUUID } from 'crypto'
import { createServer, IncomingMessage, Server, ServerResponse } from 'http'
import { DevDispatch } from '../../feature.js'
import { ROUTE_HEADER } from '../../feature/bundle/util.js'
import { writeWebResponse } from '../router.js'
import { parseTraceHeader, readBody, TRACE_HEADER, trackConnections } from '../util.js'

export type RestRoute = {
	// The api gateway route key, like "GET /users/{id}" or "$default".
	routeKey: string
	// The bundle route that handles it.
	bundleRoute: string
}

type CompiledRestRoute = RestRoute & {
	method?: string
	segments?: string[]
}

// A minimal api gateway emulator: route keys match with the api
// gateway rules - literal segments beat {param} segments, which beat a
// greedy {proxy+} tail, with $default as the fallback.
const matchRoute = (routes: CompiledRestRoute[], method: string, path: string) => {
	const segments = path.split('/').filter(Boolean)

	let best: { route: CompiledRestRoute; params: Record<string, string>; score: number } | undefined

	for (const route of routes) {
		if (!route.segments || (route.method !== 'ANY' && route.method !== method)) {
			continue
		}

		const params: Record<string, string> = {}
		let score = 0
		let matched = true

		for (let i = 0; i < route.segments.length; i++) {
			const segment = route.segments[i]!
			const greedy = segment.startsWith('{') && segment.endsWith('+}')

			if (greedy) {
				// A greedy route needs at least one segment, like api
				// gateway: /{proxy+} never matches the bare /.
				if (i >= segments.length) {
					matched = false
				} else {
					params[segment.slice(1, -2)] = segments.slice(i).join('/')
					score += 1
				}
				break
			}

			const value = segments[i]

			if (value === undefined) {
				matched = false
				break
			}

			if (segment.startsWith('{') && segment.endsWith('}')) {
				params[segment.slice(1, -1)] = value
				score += 2
			} else if (segment === value) {
				score += 3
			} else {
				matched = false
				break
			}
		}

		const greedyTail = route.segments.at(-1)?.endsWith('+}')

		if (matched && !greedyTail && route.segments.length !== segments.length) {
			matched = false
		}

		if (matched && (!best || score > best.score)) {
			best = { route, params, score }
		}
	}

	return (
		best ??
		(routes.find(route => route.routeKey === '$default') && {
			route: routes.find(route => route.routeKey === '$default')!,
			params: {},
			score: 0,
		})
	)
}

export const createRestServer = (props: { id: string; routes: RestRoute[] }) => {
	let server: Server | undefined
	let closeServer: (() => Promise<void>) | undefined
	let dispatch: DevDispatch | undefined

	const routes: CompiledRestRoute[] = props.routes.map(route => {
		if (route.routeKey === '$default') {
			return route
		}

		const [method, path] = route.routeKey.split(' ')

		return {
			...route,
			method,
			segments: (path ?? '/').split('/').filter(Boolean),
		}
	})

	const handle = async (req: IncomingMessage, res: ServerResponse) => {
		const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
		const found = matchRoute(routes, req.method ?? 'GET', url.pathname)

		if (!found) {
			res.writeHead(404, { 'content-type': 'application/json' })
			res.end(JSON.stringify({ message: 'Not Found' }))
			return
		}

		const body = await readBody(req)
		const headers: Record<string, string> = {}

		for (const [name, value] of Object.entries(req.headers)) {
			if (typeof value === 'string') {
				headers[name.toLowerCase()] = value
			} else if (Array.isArray(value)) {
				headers[name.toLowerCase()] = value.join(',')
			}
		}

		// The api gateway integration overwrites the route header, so a
		// client can never hijack the routing.
		headers[ROUTE_HEADER] = found.route.bundleRoute

		const queryStringParameters: Record<string, string> = {}
		for (const [name, value] of url.searchParams) {
			queryStringParameters[name] = value
		}

		const now = new Date()

		const result = await dispatch?.(
			{
				version: '2.0',
				routeKey: found.route.routeKey,
				rawPath: url.pathname,
				rawQueryString: url.search.slice(1),
				cookies: req.headers.cookie ? req.headers.cookie.split(';').map(v => v.trim()) : undefined,
				headers,
				queryStringParameters,
				pathParameters: Object.keys(found.params).length > 0 ? found.params : undefined,
				requestContext: {
					accountId: '000000000000',
					apiId: props.id,
					domainName: url.hostname,
					domainPrefix: url.hostname.split('.')[0],
					http: {
						method: req.method ?? 'GET',
						path: url.pathname,
						protocol: 'HTTP/1.1',
						sourceIp: req.socket.remoteAddress ?? '127.0.0.1',
						userAgent: headers['user-agent'] ?? '',
					},
					requestId: randomUUID(),
					routeKey: found.route.routeKey,
					stage: '$default',
					time: now.toISOString(),
					timeEpoch: now.getTime(),
				},
				body: body.length > 0 ? body.toString('base64') : undefined,
				isBase64Encoded: body.length > 0,
			},
			parseTraceHeader(req.headers[TRACE_HEADER])
		)

		writeWebResponse(res, result)
	}

	return {
		connect(dispatchFn: DevDispatch) {
			dispatch = dispatchFn
		},
		// Binds immediately on a free port & returns the actual port, so
		// a stale reserved port can never end up in the environment.
		async listen(port = 0) {
			server = createServer((req, res) => {
				handle(req, res).catch(error => {
					res.writeHead(500, { 'content-type': 'text/plain' })
					res.end(error instanceof Error ? `${error.name}: ${error.message}` : String(error))
				})
			})

			await new Promise<void>((resolve, reject) => {
				server!.once('error', reject)
				closeServer = trackConnections(server!)
				server!.listen(port, '127.0.0.1', () => resolve())
			})

			return (server.address() as { port: number }).port
		},
		stop() {
			return closeServer?.() ?? Promise.resolve()
		},
	}
}
