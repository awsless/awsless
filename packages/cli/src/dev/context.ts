import { DynamoDBServer } from '@awsless/dynamodb-server'
import { join } from 'path'
import { AppConfig } from '../config/app.js'
import { StackConfig } from '../config/stack.js'
import { DevContext, DevResource, DevRoute, DevServer } from '../feature.js'
import { createS3Server, StoreNotificationRule } from './servers/s3.js'
import { ServerPool } from './pool.js'
import { directories } from '../util/path.js'

export type DevRegistry = {
	context: DevContext
	env: Record<string, string>
	routes: DevRoute[]
	servers: DevServer[]
	restartPaths: string[]
	resources: DevResource[]
	events: {
		emit: (channel: string, data: unknown) => void
		subscribe: (channel: string, listener: (data: unknown) => void) => () => void
	}
}

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

	// A tiny event bus streaming live resource events to the dashboard.
	// Every channel keeps a short replay buffer, so a panel opened
	// after the fact still shows the recent events.
	const listeners = new Map<string, Set<(data: unknown) => void>>()
	const replays = new Map<string, unknown[]>()

	const events = {
		emit(channel: string, data: unknown) {
			const replay = replays.get(channel) ?? []

			replay.push(data)

			while (replay.length > 100) {
				replay.shift()
			}

			replays.set(channel, replay)
			listeners.get(channel)?.forEach(listener => listener(data))
		},
		subscribe(channel: string, listener: (data: unknown) => void) {
			if (!listeners.has(channel)) {
				listeners.set(channel, new Set())
			}

			listeners.get(channel)!.add(listener)

			for (const data of replays.get(channel) ?? []) {
				listener(data)
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

	// Stores, images & icons all live in the shared asset style s3
	// server, while the bundle can only point at one endpoint, so they
	// share one lazy server. The rules array stays mutable, so features
	// can register their notification rules before traffic flows. The
	// server is kept across restarts & the rules reset every run.
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

	return {
		env,
		routes,
		servers,
		restartPaths,
		resources,
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
		},
	}
}
