import { loadWorkspace } from '@awsless/ts-file-cache'
import { constantCase } from 'change-case'
import { watch } from 'chokidar'
import { mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { createApp } from '../app.js'
import { build, getBuildPath } from '../build/index.js'
import { AppConfig } from '../config/app.js'
import { StackConfig } from '../config/stack.js'
import { features } from '../feature/index.js'
import { getBundleFunctionName } from '../util/name.js'
import { directories } from '../util/path.js'
import { createDevContext } from './context.js'
import { ServerPool } from './pool.js'
import { debug } from '../cli/debug.js'
import { createDashboardServer } from './dashboard/index.js'
import { createFailureReporter } from './failure.js'
import { startDevRouter } from './router.js'
import { createBlockedServer } from './servers/blocked.js'
import { createLambdaServer } from './servers/lambda.js'
import { linkSdkPackages } from './sdk.js'
import { createBundleWorker } from './worker.js'

export type DevInstance = {
	port: number
	dashboardPort: number
	routerPorts: Record<string, number>
	stop: () => Promise<void>
}

// The account id backing the local environment. The value only feeds
// derived resource names & the app id, so any stable value works.
const LOCAL_ACCOUNT_ID = '000000000000'

export const startDev = async (props: {
	appConfig: AppConfig
	stackConfigs: StackConfig[]
	port: number
	pool: ServerPool
	onLog?: (message: string) => void
}): Promise<DevInstance> => {
	const log = props.onLog ?? (() => {})
	const { appConfig, stackConfigs } = props

	// The synth is pure, so we can run it with a fake account to collect
	// the builders, including the bundle build with every handler route.
	const { builders, appId } = createApp({
		appConfig,
		stackConfigs,
		accountId: LOCAL_ACCOUNT_ID,
	})

	// The local state folder holds the emulated resource data, seeds &
	// the local config values.
	await mkdir(join(directories.output, 'local'), { recursive: true })

	// Every configured router runs as its own local server, like every
	// router is its own domain in production. The dashboard takes the
	// base port, the routers follow it in config order.
	const routerPorts: Record<string, number> = {}

	Object.keys(appConfig.router ?? {}).forEach((id, index) => {
		routerPorts[id] = props.port + 1 + index
	})

	// A fresh run starts with a clean claim set, so the sweep only
	// keeps what this run's config still declares.
	props.pool.begin()

	const dev = createDevContext({ appConfig, stackConfigs, appId, routerPorts, log, pool: props.pool })

	// The first run may download local servers like opensearch or redis,
	// which the feature hooks report through the boot task spinner.
	log('Preparing the local resources...')

	for (const feature of features) {
		await feature.onDev?.(dev.context)
	}

	// Pooled servers whose resource disappeared from the config stop
	// here, before the fresh wiring starts.
	await props.pool.sweep()

	// Every aws service without a local emulation fails loud & fast,
	// instead of silently reaching the real aws with fake credentials.
	// Emulated services win via their service specific endpoint vars.
	const blocked = await props.pool.keep('blocked', null, async () => {
		const server = createBlockedServer({ onLog: message => debug(message) })
		const port = await server.listen()

		return { value: { server, port }, stop: () => server.stop() }
	})
	const blockedPort = blocked.port

	const bundleName = getBundleFunctionName(appConfig.name)
	const buildDir = getBuildPath('bundle', bundleName, '.')

	// The lambda emulator carries the bundle's sns fan-out self invokes,
	// async task invokes & outside callers, by routing Invoke calls back
	// into the worker.
	const pooledLambda = await props.pool.keep('lambda', bundleName, async () => {
		const server = createLambdaServer({ functionName: bundleName })
		const port = await server.listen()

		return { value: { server, port }, stop: () => server.stop() }
	})
	const lambda = pooledLambda.server
	const lambdaPort = pooledLambda.port

	const env: Record<string, string> = {
		APP: appConfig.name,
		APP_ID: appId,
		AWSLESS_ENV: 'local',
		AWS_REGION: appConfig.region,
		AWS_ACCOUNT_ID: LOCAL_ACCOUNT_ID,
		AWS_ACCESS_KEY_ID: 'local',
		AWS_SECRET_ACCESS_KEY: 'local',
		AWS_LAMBDA_FUNCTION_NAME: bundleName,
		AWS_LAMBDA_FUNCTION_VERSION: 'local',
		AWS_ENDPOINT_URL: `http://127.0.0.1:${blockedPort}`,
		AWS_ENDPOINT_URL_LAMBDA: `http://127.0.0.1:${lambdaPort}`,
		...dev.env,
	}

	// The bind carries a bare host like the deployed domain name bind,
	// so app code can prepend its own protocol.
	for (const [id, port] of Object.entries(routerPorts)) {
		env[`ROUTER_${constantCase(id)}_ENDPOINT`] = `localhost:${port}`
	}

	// Sibling processes like `awsless bind --local vite dev` attach to
	// the running dev environment through this file.
	await writeFile(join(directories.output, 'local', 'env.json'), JSON.stringify(env, null, '\t') + '\n')

	// The bundle inlines the build output of other features, like the
	// SSR server code of the sites, so the bundle must build last.
	// Builds are fingerprint cached, so unchanged builders are cheap.
	const sorted = [...builders].sort((a, b) => Number(a.type === 'bundle') - Number(b.type === 'bundle'))

	// The workspace scan only depends on boot stable state, so one scan
	// serves every rebuild instead of blocking each one.
	const workspace = await loadWorkspace(directories.root)

	const buildAll = async () => {

		for (const builder of sorted) {
			await build(builder.type, builder.name, builder.builder, { workspace })
		}

		// The deploy resolves the bundle env into this file, but locally
		// the worker env carries everything.
		await writeFile(getBuildPath('bundle', bundleName, 'files/awsless-env.mjs'), 'export default {}\n')

		// Play the lambda runtime role for aws sdk packages the project
		// doesn't depend on directly.
		await linkSdkPackages(buildDir, log)
	}

	log('Building the bundle...')
	await buildAll()

	const worker = createBundleWorker({ buildDir, env, functionName: bundleName })

	// Source changes never rebuild in the background - they only mark
	// the bundle dirty & the next invoke loads the fresh code. Only app
	// & stack config changes restart the whole dev environment.
	let dirty = false
	let fresh: Promise<void> | undefined

	const ensureFresh = async () => {
		if (!dirty) {
			return
		}

		fresh ??= (async () => {
			dirty = false
			const started = Date.now()

			try {
				await buildAll()
				await worker.restart()

				log(`Reloaded the bundle in ${Date.now() - started}ms`)
			} catch (error) {
				// Retry on the next invoke.
				dirty = true
				throw error
			} finally {
				fresh = undefined
			}
		})()

		await fresh
	}

	const dispatch = async (event: unknown) => {
		await ensureFresh()

		return worker.dispatch(event)
	}

	// Failed async consumers route to the on-failure consumer when the
	// app has one, instead of retry & dlq machinery.
	const reportFailure = createFailureReporter({
		enabled: Boolean(appConfig.onFailure),
		dispatch,
		log,
	})

	// Local resource servers already listen since their onDev hook ran,
	// so the worker module init can talk to them right away. Their
	// dispatch only fires in reaction to traffic, so the worker is
	// always up by then.
	lambda.connect(dispatch, reportFailure)

	log('Starting the local servers...')

	for (const server of dev.servers) {
		await server.start({ dispatch, log, reportFailure, env })
	}

	log('Starting the bundle worker...')

	// A worker that fails to boot must never take down the dev server:
	// the router, dashboard & watcher stay up, and the next invoke
	// rebuilds & retries.
	try {
		await worker.start()
	} catch (error) {
		log(`The bundle worker failed to start: ${error instanceof Error ? error.message : String(error)}`)
		log('Fix the error - the next invoke retries.')
		dirty = true
	}

	const routers: { stop: () => Promise<void> }[] = []

	for (const [id, port] of Object.entries(routerPorts)) {
		routers.push(
			await startDevRouter({
				routes: dev.routes.filter(route => route.routerId === id),
				port,
				dispatch,
			})
		)
	}

	const dashboardPort = props.port
	const dashboard = createDashboardServer({
		app: appConfig.name,
		region: appConfig.region,
		routerPorts,
		resources: dev.resources,
		routes: dev.routes,
		env,
		storeRoot: join(directories.output, 'local', 'store'),
		configFile: join(directories.output, 'local', 'config.json'),
		events: dev.events,
	})

	dashboard.connect(dispatch)
	await dashboard.listen(dashboardPort)

	// The source watcher only marks the bundle dirty, it never builds.
	const watcher = watch(directories.root, {
		ignored: ['**/node_modules/**', '**/.awsless/**', '**/dist/**', '**/.git/**', '**/*.stack.*', '**/app.json*'],
		ignoreInitial: true,
		awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
	})

	watcher.on('all', () => {
		dirty = true
	})

	// Files like the local config are only read during worker module
	// init, so a change just needs a worker restart, not a rebuild.
	const restartWatcher = dev.restartPaths.length > 0 ? watch(dev.restartPaths, { ignoreInitial: true }) : undefined

	restartWatcher?.on('all', () => {
		void worker.restart().then(() => log('Restarted the bundle worker.'))
	})

	return {
		port: props.port,
		dashboardPort,
		routerPorts,
		async stop() {
			await rm(join(directories.output, 'local', 'env.json'), { force: true })
			await watcher.close()
			await restartWatcher?.close()

			for (const router of routers) {
				await router.stop()
			}

			await dashboard.stop()

			// The worker stops before the local resource servers, so its
			// open connections never retry against dead servers.
			await worker.stop()

			// Reverse registration order, so dependent servers stop
			// before the servers they rely on.
			for (const server of [...dev.servers].reverse()) {
				await server.stop?.()
			}

		},
	}
}
