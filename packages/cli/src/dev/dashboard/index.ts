import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import { Redis } from 'ioredis'
import { readdir, readFile, stat, writeFile } from 'fs/promises'
import { createServer, IncomingMessage, Server } from 'http'
import { join, relative, sep } from 'path'
import { DevDispatch, DevResource, DevRoute } from '../../feature.js'
import { WorkerError } from '../worker.js'
import { dashboardHtml } from './html.js'
import { trackConnections } from '../util.js'

const readBody = (req: IncomingMessage) => {
	return new Promise<Buffer>((resolve, reject) => {
		const chunks: Buffer[] = []
		req.on('data', chunk => chunks.push(chunk))
		req.on('error', reject)
		req.on('end', () => resolve(Buffer.concat(chunks)))
	})
}

// The local dev dashboard: lists every resource in the app & lets you
// invoke routes, publish topics, browse table & store data, and edit
// the local config values.
export const createDashboardServer = (props: {
	app: string
	region: string
	routerPorts: Record<string, number>
	resources: DevResource[]
	routes: DevRoute[]
	env: Record<string, string>
	storeRoot: string
	configFile: string
	// The config names that resolved from the boot-time ssm pull.
	configPulled?: string[]
	// Re-runs the stack seed files, when any are configured.
	runSeeds?: () => Promise<void>
	events: {
		subscribe: (channel: string, listener: (data: unknown) => void) => () => void
	}
}) => {
	let server: Server | undefined
	let closeServer: (() => Promise<void>) | undefined
	let dispatch: DevDispatch | undefined
	let documentClient: DynamoDBDocumentClient | undefined

	const getDocumentClient = () => {
		documentClient ??= DynamoDBDocumentClient.from(
			new DynamoDBClient({
				endpoint: props.env.AWS_ENDPOINT_URL_DYNAMODB,
				region: props.region,
				credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
			})
		)

		return documentClient
	}

	const handle = async (req: IncomingMessage): Promise<{ status: number; body: string; type?: string }> => {
		const url = new URL(req.url ?? '/', 'http://localhost')

		if (!url.pathname.startsWith('/api/')) {
			// Every non-api path serves the page & the client routes on
			// the pathname, so views like /functions are plain urls.
			// The state ships embedded in the page, so the dashboard
			// renders without any api round trip.
			const state = JSON.stringify({
				app: props.app,
				routerPorts: props.routerPorts,
				resources: props.resources,
				routes: props.routes,
				seeds: Boolean(props.runSeeds),
			}).replaceAll('<', '\\u003c')

			return { status: 200, body: dashboardHtml.replace('__STATE__', state), type: 'text/html' }
		}

		if (url.pathname === '/api/state') {
			return {
				status: 200,
				body: JSON.stringify({
					app: props.app,
					routerPorts: props.routerPorts,
					resources: props.resources,
					routes: props.routes,
				}),
			}
		}

		if (url.pathname === '/api/invoke' && req.method === 'POST') {
			const { routeKey, event } = JSON.parse((await readBody(req)).toString() || '{}')
			const result = await dispatch?.({ '$awsless-route': routeKey, event: event ?? {} })

			return { status: 200, body: JSON.stringify({ result: result ?? null }) }
		}

		if (url.pathname === '/api/publish' && req.method === 'POST') {
			const { topic, message } = JSON.parse((await readBody(req)).toString() || '{}')

			// The same sns event the local sns emulator dispatches, so the
			// bundle fans out to every subscriber.
			const result = await dispatch?.({
				Records: [
					{
						EventSource: 'aws:sns',
						EventVersion: '1.0',
						Sns: {
							Type: 'Notification',
							MessageId: randomUUID(),
							TopicArn: `arn:aws:sns:${props.region}:000000000000:${topic}`,
							Message: typeof message === 'string' ? message : JSON.stringify(message ?? {}),
							Timestamp: new Date().toISOString(),
							MessageAttributes: {},
						},
					},
				],
			})

			return { status: 200, body: JSON.stringify({ result: result ?? null }) }
		}

		if (url.pathname === '/api/table') {
			const name = url.searchParams.get('name')!

			try {
				const result = await getDocumentClient().send(new ScanCommand({ TableName: name, Limit: 100 }))

				return { status: 200, body: JSON.stringify({ items: result.Items ?? [], count: result.Count ?? 0 }) }
			} catch (error) {
				throw new Error(
					`Scanning "${name}" via ${props.env.AWS_ENDPOINT_URL_DYNAMODB ?? 'no dynamodb endpoint'} failed: ${
						error instanceof Error ? error.message : String(error)
					}`
				)
			}
		}

		if (url.pathname === '/api/cache') {
			const [host, port] = (url.searchParams.get('target') ?? '').split(':')
			const redis = new Redis({ host, port: Number(port), lazyConnect: true })

			try {
				await redis.connect()

				// Only scan the databases that actually hold keys.
				const keyspace = await redis.info('keyspace')
				const dbs = [...keyspace.matchAll(/^db(\d+):/gm)].map(match => Number(match[1]))
				const entries: { db: number; key: string; type: string; ttl: number; value: unknown }[] = []

				for (const db of dbs) {
					await redis.select(db)

					const keys = (await redis.scan(0, 'COUNT', 100))[1].slice(0, 100)

					for (const key of keys) {
						const type = await redis.type(key)
						const ttl = await redis.ttl(key)

						let value: unknown

						if (type === 'string') {
							value = await redis.get(key)
						} else if (type === 'hash') {
							value = await redis.hgetall(key)
						} else if (type === 'list') {
							value = await redis.lrange(key, 0, 9)
						} else if (type === 'set') {
							value = (await redis.smembers(key)).slice(0, 10)
						} else if (type === 'zset') {
							value = await redis.zrange(key, 0, 9, 'WITHSCORES')
						}

						entries.push({ db, key, type, ttl, value })
					}
				}

				return { status: 200, body: JSON.stringify({ entries }) }
			} finally {
				redis.disconnect()
			}
		}

		if (url.pathname === '/api/search' && req.method === 'POST') {
			// The browser can't reach the local opensearch cross origin,
			// so the dashboard proxies the explorer requests.
			const { target, path, body } = JSON.parse((await readBody(req)).toString() || '{}') as {
				target: string
				path: string
				body?: unknown
			}

			const result = await fetch(`http://${target}${path}`, {
				method: body === undefined ? 'GET' : 'POST',
				headers: { 'content-type': 'application/json' },
				body: body === undefined ? undefined : JSON.stringify(body),
			})

			return { status: 200, body: JSON.stringify({ status: result.status, data: await result.json() }) }
		}

		if (url.pathname === '/api/store') {
			const prefix = url.searchParams.get('prefix') ?? ''
			const files: { key: string; size: number; modified: string }[] = []

			const walk = async (dir: string) => {
				let entries
				try {
					entries = await readdir(dir, { withFileTypes: true })
				} catch (_) {
					return
				}

				for (const entry of entries) {
					const path = join(dir, entry.name)

					if (entry.isDirectory()) {
						await walk(path)
					} else {
						// Keys are relative to the bucket folder, one level below the store root.
						const key = relative(props.storeRoot, path).split(sep).slice(1).join('/')

						if (key.startsWith(prefix)) {
							const info = await stat(path)
							files.push({ key, size: info.size, modified: info.mtime.toISOString() })
						}
					}
				}
			}

			await walk(props.storeRoot)

			return { status: 200, body: JSON.stringify({ files }) }
		}

		if (url.pathname === '/api/seed' && req.method === 'POST') {
			if (!props.runSeeds) {
				return { status: 400, body: JSON.stringify({ error: 'No seed files configured.' }) }
			}

			try {
				await props.runSeeds()
				return { status: 200, body: JSON.stringify({ ok: true }) }
			} catch (error) {
				return {
					status: 500,
					body: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
				}
			}
		}

		if (url.pathname === '/api/config') {
			if (req.method === 'PUT') {
				const values = JSON.parse((await readBody(req)).toString() || '{}')

				await writeFile(props.configFile, JSON.stringify(values, null, '\t') + '\n')

				return { status: 200, body: JSON.stringify({ ok: true }) }
			}

			let values = {}
			try {
				values = JSON.parse(await readFile(props.configFile, 'utf8'))
			} catch (_) {}

			return {
				status: 200,
				body: JSON.stringify({
					values,
					pulled: props.configPulled ?? [],
				}),
			}
		}

		return { status: 404, body: JSON.stringify({ error: `Unknown dashboard path: ${url.pathname}` }) }
	}

	// Live resource events stream to the dashboard as server sent
	// events, one connection per open panel.
	const streamEvents = (req: IncomingMessage, res: import('http').ServerResponse, channel: string) => {
		res.writeHead(200, {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache',
			connection: 'keep-alive',
		})

		res.write(':connected\n\n')

		const unsubscribe = props.events.subscribe(channel, data => {
			res.write(`data: ${JSON.stringify(data)}\n\n`)
		})

		const heartbeat = setInterval(() => res.write(':heartbeat\n\n'), 15_000)

		req.on('close', () => {
			clearInterval(heartbeat)
			unsubscribe()
		})
	}

	return {
		connect(dispatchFn: DevDispatch) {
			dispatch = dispatchFn
		},
		async listen(port: number) {
			server = createServer((req, res) => {
				const url = new URL(req.url ?? '/', 'http://localhost')

				if (url.pathname === '/api/events') {
					streamEvents(req, res, url.searchParams.get('channel') ?? '')
					return
				}

				const started = performance.now()

				handle(req)
					.then(({ status, body, type }) => {
						res.writeHead(status, {
							'content-type': type ?? 'application/json',
							// Shows the real handler time in the browser
							// devtools, separating it from queueing delays.
							'server-timing': `handler;dur=${(performance.now() - started).toFixed(1)}`,
						})
						res.end(body)
					})
					.catch(error => {
						const message =
							error instanceof WorkerError || error instanceof Error ? error.message : String(error)

						res.writeHead(500, { 'content-type': 'application/json' })
						res.end(JSON.stringify({ error: message }))
					})
			})

			await new Promise<void>((resolve, reject) => {
				server!.once('error', reject)
				closeServer = trackConnections(server!)
				server!.listen(port, '127.0.0.1', () => resolve())
			})
		},
		stop() {
			// The scan client holds a keep-alive connection to the local
			// dynamodb server, which would hang that server's stop.
			documentClient?.destroy()

			return closeServer?.() ?? Promise.resolve()
		},
	}
}
