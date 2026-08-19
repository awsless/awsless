import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { RedisServer } from '@awsless/redis'
import { formatRouteEnvName } from 'awsless'
import { Redis } from 'ioredis'
import { spawnDevChild } from '../../dev/children.js'
import { createSnsServer } from '../../dev/servers/sns.js'
import { findFreePort, stopChild } from '../../dev/util.js'
import { DevContext } from '../../feature.js'
import { formatGlobalResourceName, getBundleFunctionName } from '../../util/name.js'
import { formatRouteKey } from '../bundle/util.js'

const waitForHealth = async (port: number, timeoutMs: number) => {
	const deadline = Date.now() + timeoutMs

	while (Date.now() < deadline) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}/health`)

			if (res.ok) {
				return
			}
		} catch {}

		await new Promise(resolve => setTimeout(resolve, 200))
	}

	throw new Error('The local pubsub server never became ready.')
}

// Local pubsub runs the exact same self contained websocket server that
// runs on fargate in production, wired to a local plaintext redis for
// the fan out & the local lambda & sns emulators for auth & lifecycle
// events.
export const pubsubOnDev = async (ctx: DevContext) => {
	const ids = Object.keys(ctx.appConfig.pubsub ?? {})

	if (ids.length === 0) {
		return
	}

	for (const id of ids) {
		// The lifecycle events every stack listens for, mirroring the
		// sns subscription filter policy in production.
		const declared = new Set<string>()

		for (const stack of ctx.stackConfigs) {
			for (const event of Object.keys(stack.pubsub?.[id] ?? {})) {
				declared.add(event)
			}
		}

		// The redis fan out, the sns emulator & the websocket port all
		// survive dev restarts, so the long lived websocket server child
		// keeps talking to live endpoints.
		const { redisPort, sns, snsPort, wsPort, redisSink } = await ctx.keep(`pubsub-core:${id}`, null, async () => {
			const redis = new RedisServer()

			await redis.start()
			await redis.ping()

			const redisSink: { health?: (status: 'up' | 'down', detail?: string) => void; crashed?: string } = {}

			redis.onExit((code, signal) => {
				redisSink.crashed = code !== null ? `exited with code ${code}` : `killed by ${signal}`
				redisSink.health?.('down', redisSink.crashed)
			})

			const redisPort = await redis.getPort()
			const sns = createSnsServer()
			const snsPort = await sns.listen()
			const wsPort = await findFreePort()

			return {
				value: { redisPort, sns, snsPort, wsPort, redisSink },
				stop: async () => {
					await sns.stop()
					await redis.kill()
				},
			}
		})

		// The health sink swaps every run - a crash while no run listened
		// still reports through the crashed marker.
		redisSink.health = (status, detail) => ctx.reportHealth(`pubsub ${id} redis`, status, detail)
		redisSink.health(redisSink.crashed ? 'down' : 'up', redisSink.crashed)

		ctx.retain(`pubsub-ws:${id}`)

		const channel = `pubsub:${id}`
		const publisherRoute = formatRouteKey('base', 'pubsub', `${id}-publisher`)
		const eventsTopic = formatGlobalResourceName({
			appName: ctx.appConfig.name,
			resourceType: 'pubsub-events',
			resourceName: id,
		})

		// The publisher handler inside the bundle publishes straight to
		// the local redis, exactly like it does against elasticache.
		ctx.addEnv(formatRouteEnvName(publisherRoute, 'REDIS_HOST'), '127.0.0.1')
		ctx.addEnv(formatRouteEnvName(publisherRoute, 'REDIS_PORT'), String(redisPort))
		ctx.addEnv(formatRouteEnvName(publisherRoute, 'REDIS_TLS'), 'disabled')
		ctx.addEnv(formatRouteEnvName(publisherRoute, 'CHANNEL'), channel)

		// The websocket server sits behind the local router, exactly
		// like the deployed router proxies it to the fargate service.
		const { path, router } = ctx.appConfig.pubsub![id]!
		const endpoint = `ws://localhost:${ctx.routerPort(router)}${path}`

		ctx.addRoute({
			routerId: ctx.appConfig.pubsub![id]!.router,
			pattern: `${path}/*`,
			proxy: `http://127.0.0.1:${wsPort}`,
			// The bare mount path maps to the websocket route at the
			// server root, deeper paths keep their sub path.
			rewrite: {
				regex: `^${path}(?:/(.*))?$`,
				to: '/$1',
			},
		})

		ctx.registerResource({
			kind: 'pubsub',
			id,
			routeKey: publisherRoute,
			detail: endpoint,
			channel,
		})

		let feed: Redis | undefined

		ctx.registerServer({
			name: `pubsub ${id}`,
			async start({ dispatch, reportFailure, env }) {
				// The dashboard live feed taps the redis fan out channel,
				// so it sees every published message on every topic.
				feed = new Redis({
					host: '127.0.0.1',
					port: redisPort,
					lazyConnect: true,
					maxRetriesPerRequest: 3,
					retryStrategy(times) {
						return times > 3 ? null : Math.min(times * 200, 1000)
					},
				})
				feed.on('error', () => {})

				await feed.connect()
				await feed.subscribe(channel)

				feed.on('message', (_channel, json) => {
					try {
						const message = JSON.parse(json) as { topic?: string; event?: string; payload?: string }
						let payload: unknown = message.payload

						try {
							payload = message.payload === undefined ? undefined : JSON.parse(message.payload)
						} catch {}

						ctx.emitEvent(`pubsub:${id}`, {
							kind: 'message',
							date: new Date().toISOString(),
							topic: message.topic,
							event: message.event,
							payload,
						})
					} catch {}
				})

				// Only the declared lifecycle events reach the bundle,
				// like the sns filter policy in production - but the
				// dashboard feed sees them all.
				sns.connect(async event => {
					const records = event as {
						Records?: {
							Sns?: { Message?: string; MessageAttributes?: Record<string, { Value?: string }> }
						}[]
					}
					const record = records.Records?.[0]?.Sns
					const type = record?.MessageAttributes?.event?.Value

					let data: unknown = record?.Message

					try {
						data = record?.Message === undefined ? undefined : JSON.parse(record.Message)
					} catch {}

					ctx.emitEvent(`pubsub:${id}`, {
						kind: 'lifecycle',
						date: new Date().toISOString(),
						event: type,
						payload: data,
					})

					if (!type || !declared.has(type)) {
						return
					}

					return dispatch(event)
				}, reportFailure)

				// The websocket server child survives restarts, since all
				// its endpoints (redis, sns, the lambda emulator) come
				// from the pool with stable ports. The health sink swaps
				// every run, since each run builds a fresh registry.
				const ws = await ctx.keep(`pubsub-ws:${id}`, { wsPort, redisPort, snsPort }, async () => {
					const sink: { health?: (status: 'up' | 'down', detail?: string) => void; stopping: boolean } = {
						stopping: false,
					}

					const runtime = join(dirname(fileURLToPath(import.meta.url)), 'handlers', 'pubsub-server.js')

					// Silence the server's boot log & keep its errors. The
					// stderr is piped instead of inherited, so the node
					// child never snapshots & restores the tty termios on
					// exit (which would re-apply the boot spinner's raw
					// mode & kill ctrl-c).
					const child = spawnDevChild(process.execPath, [runtime], {
						stdio: ['ignore', 'ignore', 'pipe'],
						env: {
							PATH: process.env.PATH,
							PORT: String(wsPort),
							BIND_ADDRESS: '127.0.0.1',
							APP: env.APP,
							AUTH: `${getBundleFunctionName(ctx.appConfig.name)}:live`,
							AUTH_ROUTE: formatRouteKey('base', 'pubsub', `${id}-auth`),
							EVENTS_TOPIC: eventsTopic,
							REDIS_HOST: '127.0.0.1',
							REDIS_PORT: String(redisPort),
							REDIS_TLS: 'disabled',
							CHANNEL: channel,
							AWS_REGION: env.AWS_REGION,
							AWS_ACCOUNT_ID: env.AWS_ACCOUNT_ID,
							AWS_ACCESS_KEY_ID: 'local',
							AWS_SECRET_ACCESS_KEY: 'local',
							AWS_ENDPOINT_URL_LAMBDA: env.AWS_ENDPOINT_URL_LAMBDA,
							AWS_ENDPOINT_URL_SNS: `http://127.0.0.1:${snsPort}`,
						},
					})

					child.stderr?.on('data', chunk => process.stderr.write(chunk))

					child.on('exit', (code, signal) => {
						// A signal exit (code null) is usually the terminal
						// group SIGINT of a ctrl-c - the health chip goes
						// down on any exit we didn't ask for.
						if (!sink.stopping) {
							sink.health?.('down', code !== null ? `exited with code ${code}` : `killed by ${signal}`)
						}
					})

					await waitForHealth(wsPort, 30_000)

					return {
						value: { child, sink },
						stop: async () => {
							sink.stopping = true
							await stopChild(child)
						},
					}
				})

				// The pooled child may have died while no run was
				// listening - report its real state, not just changes.
				ws.sink.health = (status, detail) => ctx.reportHealth(`pubsub ${id}`, status, detail)
				ws.sink.stopping = false
				ws.sink.health(ws.child.exitCode === null ? 'up' : 'down')
			},
			async stop() {
				// The child, sns & redis live in the pool - only the per
				// run dashboard feed disconnects.
				feed?.disconnect()
			},
		})
	}
}
