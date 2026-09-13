import { join } from 'path'
import { toSeconds } from '@awsless/duration'
import { DynamoDBServer } from '@awsless/dynamodb-server'
import { AppConfig } from '../config/app.js'
import { StackConfig } from '../config/stack.js'
import { DevContext, DevResource, DevRoute, DevServer } from '../feature.js'
import { formatLocalResourceName } from '../util/name.js'
import { directories } from '../util/path.js'
import { ServerPool } from './pool.js'
import { createS3Server, StoreNotificationRule } from './servers/s3.js'
import { createSnsServer } from './servers/sns.js'
import { createSqsServer } from './servers/sqs.js'

export type HealthEntry = {
	id: string
	status: 'up' | 'down'
	detail?: string
	date: number
}

export type DevRegistry = {
	context: DevContext
	env: Record<string, string>
	routes: DevRoute[]
	servers: DevServer[]
	restartPaths: string[]
	resources: DevResource[]
	health: Map<string, HealthEntry>
	events: {
		emit: (channel: string, data: unknown) => void
		// The replay skips ids at or below "after", so a reconnecting
		// dashboard stream never shows an event twice.
		subscribe: (
			channel: string,
			listener: (data: unknown, id: number) => void,
			options?: { after?: number }
		) => () => void
	}
}

// Ids keep counting across dev restarts, so a browser's last-event-id stays valid.
let sequence = 0

export const createDevContext = (props: {
	appConfig: AppConfig
	stackConfigs: StackConfig[]
	appId: string
	routerPorts: Record<string, number>
	log: (message: string) => void
	pool: ServerPool
}): DevRegistry => {
	const env: Record<string, string> = {}
	const routes: DevRoute[] = []
	const servers: DevServer[] = []
	const restartPaths: string[] = []
	const resources: DevResource[] = []

	// The up/down state of every moving part, for the homepage health
	// strip - the map is the snapshot, changes stream over the bus.
	const health = new Map<string, HealthEntry>()

	const reportHealth = (id: string, status: 'up' | 'down', detail?: string) => {
		const entry: HealthEntry = { id, status, detail, date: Date.now() }

		health.set(id, entry)
		events.emit('health', entry)
	}

	// Every channel keeps a short replay, so a panel opened after the
	// fact still shows the recent events.
	type Listener = (data: unknown, id: number) => void

	const listeners = new Map<string, Set<Listener>>()
	const replays = new Map<string, { id: number; data: unknown }[]>()

	const events: DevRegistry['events'] = {
		emit: (channel, data) => {
			const replay = replays.get(channel) ?? []
			const id = ++sequence

			replay.push({ id, data })

			while (replay.length > 100) {
				replay.shift()
			}

			replays.set(channel, replay)
			listeners.get(channel)?.forEach(listener => listener(data, id))
		},
		subscribe: (channel, listener, options) => {
			if (!listeners.has(channel)) {
				listeners.set(channel, new Set())
			}

			listeners.get(channel)!.add(listener)

			for (const entry of replays.get(channel) ?? []) {
				if (entry.id > (options?.after ?? 0)) {
					listener(entry.data, entry.id)
				}
			}

			return () => {
				listeners.get(channel)?.delete(listener)
			}
		},
	}

	// Multiple features store data in dynamodb, while the bundle can
	// only point at one endpoint, so they share one lazy server. The
	// server is kept across restarts, so tables & data survive config
	// changes.
	type DynamoPoolValue = { server: DynamoDBServer; tableFingerprints: Map<string, string> }

	let dynamo: Promise<DynamoPoolValue> | undefined

	const useDynamo = () => {
		dynamo ??= (async () => {
			const value = await props.pool.keep<DynamoPoolValue>('dynamo', null, async () => {
				const server = new DynamoDBServer({ engine: 'memory', region: props.appConfig.region })

				await server.listen(0)

				return {
					value: { server, tableFingerprints: new Map() },
					stop: () => server.stop(),
				}
			})

			env['AWS_ENDPOINT_URL_DYNAMODB'] = `http://127.0.0.1:${value.server.port}`

			return value
		})()

		return dynamo
	}

	// One shared s3 server, since the bundle can only point at one
	// endpoint. It survives restarts, the notification rules reset per run.
	type StorePoolValue = {
		server: ReturnType<typeof createS3Server>
		port: number
		rules: StoreNotificationRule[]
	}

	let store: Promise<{ rules: StoreNotificationRule[] }> | undefined

	const useStore = () => {
		store ??= (async () => {
			const value = await props.pool.keep<StorePoolValue>('store', null, async () => {
				const rules: StoreNotificationRule[] = []
				const server = createS3Server({
					root: join(directories.output, 'local', 'store'),
					region: props.appConfig.region,
					rules,
				})

				const port = await server.listen()

				return {
					value: { server, port, rules },
					stop: () => server.stop(),
				}
			})

			// The notification rules of the previous run reset, so
			// removed stores stop dispatching.
			value.rules.splice(0, value.rules.length)

			env['AWS_ENDPOINT_URL_S3'] = `http://127.0.0.1:${value.port}`

			servers.push({
				name: 'store',
				start({ dispatch, reportFailure }) {
					value.server.connect(dispatch, reportFailure)
				},
			})

			return { rules: value.rules }
		})()

		return store
	}

	// One shared sqs server, since the sdk resolves every queue through
	// one endpoint. It survives restarts, the queue set resets per run.
	type SqsPoolValue = {
		server: ReturnType<typeof createSqsServer>
		port: number
		queues: Map<string, string | undefined>
		visibilityTimeouts: Map<string, number>
	}

	let sqs: Promise<{ port: number; queues: Map<string, string | undefined> }> | undefined

	const useSqs = () => {
		sqs ??= (async () => {
			const value = await props.pool.keep<SqsPoolValue>('shim:sqs', null, async () => {
				const queues = new Map<string, string | undefined>()
				const visibilityTimeouts = new Map<string, number>()
				const server = createSqsServer({
					region: props.appConfig.region,
					accountId: '000000000000',
					queues,
					visibilityTimeouts,
				})

				const port = await server.listen()

				return {
					value: { server, port, queues, visibilityTimeouts },
					stop: () => server.stop(),
				}
			})

			// The queue set of the previous run resets, so removed queues
			// stop resolving.
			value.queues.clear()
			value.visibilityTimeouts.clear()

			// The deployed queues derive their visibility timeout from the
			// bundle timeout, so a local receive hides messages as long.
			const bundleTimeout = toSeconds(props.appConfig.function.timeout)

			for (const stack of props.stackConfigs) {
				for (const id of Object.keys(stack.queues ?? {})) {
					const name = formatLocalResourceName({
						appName: props.appConfig.name,
						stackName: stack.name,
						resourceType: 'queue',
						resourceName: id,
					})

					value.visibilityTimeouts.set(`${name}.fifo`, bundleTimeout + 60)
				}
			}

			env['AWS_ENDPOINT_URL_SQS'] = `http://127.0.0.1:${value.port}`

			servers.push({
				name: 'sqs',
				start({ dispatch, reportFailure }) {
					value.server.connect(dispatch, reportFailure)
				},
			})

			return { port: value.port, queues: value.queues }
		})()

		return sqs
	}

	// Topics & alerts share one sns server, since the sdk resolves every
	// publish through the single sns endpoint. The captures reset every
	// run while the captured alert feed survives restarts, like the
	// email outbox.
	type SnsPoolValue = {
		server: ReturnType<typeof createSnsServer>
		port: number
		captures: ((input: { TopicArn?: string; Subject?: string; Message?: string }) => boolean)[]
		alerts: unknown[]
	}

	let sns: Promise<Pick<SnsPoolValue, 'port' | 'captures' | 'alerts'>> | undefined

	const useSns = () => {
		sns ??= (async () => {
			const value = await props.pool.keep<SnsPoolValue>('shim:sns', null, async () => {
				const captures: SnsPoolValue['captures'] = []
				const server = createSnsServer({ captures })
				const port = await server.listen()

				return {
					value: { server, port, captures, alerts: [] },
					stop: () => server.stop(),
				}
			})

			// The captures of the previous run reset, so removed features
			// stop capturing.
			value.captures.splice(0, value.captures.length)

			env['AWS_ENDPOINT_URL_SNS'] = `http://127.0.0.1:${value.port}`

			servers.push({
				name: 'sns',
				start({ dispatch, reportFailure }) {
					value.server.connect(dispatch, reportFailure)
				},
			})

			return { port: value.port, captures: value.captures, alerts: value.alerts }
		})()

		return sns
	}

	return {
		env,
		routes,
		servers,
		restartPaths,
		resources,
		health,
		events,
		context: {
			appConfig: props.appConfig,
			stackConfigs: props.stackConfigs,
			appId: props.appId,
			routerPort(id) {
				const port = props.routerPorts[id]

				if (!port) {
					throw new Error(`No local port allocated for router "${id}"`)
				}

				return port
			},
			keep: props.pool.keep,
			retain: props.pool.retain,
			peek: props.pool.peek,
			useDynamo,
			useStore,
			useSqs,
			useSns,
			addEnv(name, value) {
				if (name in env && env[name] !== value) {
					throw new Error(
						`The env var "${name}" is defined multiple times with different values, while all bundled functions share the same env.`
					)
				}

				env[name] = value
			},
			addRoute(route) {
				routes.push(route)
			},
			registerServer(server) {
				servers.push(server)
			},
			restartOnChange(path) {
				restartPaths.push(path)
			},
			registerResource(resource) {
				resources.push(resource)
			},
			log: props.log,
			emitEvent: events.emit,
			reportHealth,
		},
	}
}
