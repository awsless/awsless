import { loadWorkspace } from '@awsless/ts-file-cache'
import { constantCase } from 'change-case'
import { watch } from 'chokidar'
import { mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { createApp } from '../app.js'
import { build, getBuildPath } from '../build/index.js'
import { AppConfig } from '../config/app.js'
import { StackConfig } from '../config/stack.js'
import { createAuthAdmin } from '../feature/auth/dev.js'
import { features } from '../feature/index.js'
import { getBundleFunctionName } from '../util/name.js'
import { directories, useDevBuildDir } from '../util/path.js'
import { createDevContext } from './context.js'
import { ServerPool } from './pool.js'
import { createDataReset } from './reset.js'
import { createSeedRunner } from './seed.js'
import { debug } from '../cli/debug.js'
import { createDashboardServer } from './dashboard/index.js'
import { createFailureReporter } from './failure.js'
import { startDevRouter } from './router.js'
import { createBlockedServer } from './servers/blocked.js'
import { createLambdaServer } from './servers/lambda.js'
import { linkSdkPackages } from './sdk.js'
import { LOCAL_ACCOUNT_ID } from './util.js'
import { createBundleWorker } from './worker.js'

export type DevInstance = {
	dashboardPort: number
	routerPorts: Record<string, number>
	stop: () => Promise<void>
}

// Boot phases run through this runner, so the cli can render each one
// as its own task line with a duration. The detail callback adds a
// breakdown of the slow parts to the finished line.
export type DevPhase = <T>(
	titles: { start: string; done: string },
	fn: (detail: (text: string) => void) => Promise<T>
) => Promise<T>

// The per-item breakdown inside a phase: everything at 100ms or more
// makes the finished line, slowest first.
const breakdown = (timings: [string, number][]) => {
	const slow = timings.filter(([, ms]) => ms >= 100).sort((a, b) => b[1] - a[1])

	return slow
		.map(([name, ms]) => `${name} ${ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`}`)
		.join(', ')
}


export const startDev = async (props: {
	appConfig: AppConfig
	stackConfigs: StackConfig[]
	port: number
	pool: ServerPool
	onLog?: (message: string) => void
	phase?: DevPhase
}): Promise<DevInstance> => {
	const log = props.onLog ?? (() => {})
	const phase: DevPhase = props.phase ?? (async ({ start }, fn) => (log(start), fn(() => {})))
	const { appConfig, stackConfigs } = props

	// Isolate the dev builds from deploy/build/test runs in the same
	// repo - see useDevBuildDir. Must happen before any builder runs.
	useDevBuildDir()

	// The synth is pure, so we can run it with a fake account to collect
	// the builders, including the bundle build with every handler route.
	const { builders, appId, ready } = createApp({
		appConfig,
		stackConfigs,
		accountId: LOCAL_ACCOUNT_ID,
		dev: true,
	})

	// Fire the deferred feature registrations (like the on-failure &
	// on-error-log consumers joining the local bundle), so the bundle
	// builder sees every route.
	ready()

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
	// keeps what this run's config still declares. The session marker
	// tells a first boot apart from a config restart.
	const firstBoot = props.pool.peek('session') === undefined

	props.pool.begin()
	await props.pool.keep('session', null, async () => ({ value: true, stop: () => {} }))

	const dev = createDevContext({ appConfig, stackConfigs, appId, routerPorts, log, pool: props.pool })

	const bundleName = getBundleFunctionName(appConfig.name)
	const buildDir = getBuildPath('bundle', bundleName, '.')

	// The first run may download local servers like opensearch or redis,
	// which the feature hooks report through the boot task spinner.
	const { env, lambda } = await phase(
		{ start: 'Preparing the local resources...', done: 'Prepared the local resources' },
		async detail => {
			const timings: [string, number][] = []

			for (const feature of features) {
				if (!feature.onDev) {
					continue
				}

				const started = Date.now()
				await feature.onDev(dev.context)
				timings.push([feature.name, Date.now() - started])
			}

			detail(breakdown(timings))

			// The lambda & blocked shims boot after the feature hooks, so
			// their pooled entries claim here to survive the sweep.
			props.pool.retain('blocked')
			props.pool.retain('lambda')

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

			return { env, lambda }
		}
	)

	// The bundle inlines the build output of other features, like the
	// SSR server code of the sites, so the bundle must build last.
	// Builds are fingerprint cached, so unchanged builders are cheap.
	const sorted = [...builders].sort((a, b) => Number(a.type === 'bundle') - Number(b.type === 'bundle'))

	// The workspace scan only depends on boot stable state, so one scan
	// serves every rebuild instead of blocking each one.
	let workspace!: Awaited<ReturnType<typeof loadWorkspace>>

	const buildAll = async () => {
		let changed = false

		for (const builder of sorted) {
			const meta = await build(builder.type, builder.name, builder.builder, { workspace })

			if (!meta?.cached) {
				changed = true
			}

			// The split per builder lands in the debug log, so a slow
			// reload points straight at its cause.
			debug(`Build ${builder.type}:${builder.name}`, meta?.cached ? 'cached' : String(meta?.buildTime))
		}

		// The deploy resolves the bundle env into this file, but locally
		// the worker env carries everything.
		await writeFile(getBuildPath('bundle', bundleName, 'files/awsless-env.mjs'), 'export default {}\n')

		// Play the lambda runtime role for aws sdk packages the project
		// doesn't depend on directly.
		await linkSdkPackages(buildDir, log)

		return changed
	}

	await phase({ start: 'Building the bundle...', done: 'Built the bundle' }, async () => {
		workspace = await loadWorkspace(directories.root)
		await buildAll()
	})

	// Every worker output line streams to the dashboard's Worker panel,
	// so handler logs & errors are debuggable without the terminal. The
	// route tag also feeds the per-resource log views.
	const emitWorkerLine = (line: string, error = false, route?: string) => {
		dev.events.emit('worker', { date: Date.now(), line, error, route })
	}

	const worker = createBundleWorker({
		buildDir,
		env,
		functionName: bundleName,
		onOutput: (line, stream, route) => emitWorkerLine(line, stream === 'stderr', route),
	})

	dev.resources.push({
		kind: 'worker',
		id: 'bundle',
		channel: 'worker',
		detail: 'The output & errors of the local bundle worker',
	})

	// Source changes never rebuild in the background - they only mark
	// the bundle dirty & the next invoke loads the fresh code. Only app
	// & stack config changes restart the whole dev environment.
	let dirty = false
	let fresh: Promise<void> | undefined

	// A stopping environment must never rebuild or respawn workers,
	// or a rebuild racing the shutdown would orphan node children.
	let stopping = false

	// A failed worker (re)start keeps the restart owed, so a later pass
	// with fully cached builds still brings the worker up.
	let restartNeeded = false

	const ensureFresh = async () => {
		if (!dirty) {
			// A rebuild may still be in flight: the fresh code marked
			// dirty false, but the worker restart hasn't finished -
			// dispatching now would hit stopped or stale workers.
			if (fresh) {
				await fresh
			}

			return
		}

		fresh ??= (async () => {
			dirty = false
			const started = Date.now()

			try {
				if (stopping) {
					return
				}

				const changed = await buildAll()
				const built = Date.now()

				// A save that leaves every build output untouched, like a
				// re-save without changes, skips the worker restart.
				if ((changed || restartNeeded) && !stopping) {
					restartNeeded = true
					await worker.restart()
					restartNeeded = false

					log(
						`Reloaded the bundle in ${Date.now() - started}ms (build ${built - started}ms, worker ${Date.now() - built}ms)`
					)
				} else if (!changed) {
					debug(`Rebuild found no changes in ${Date.now() - started}ms`)
				}
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

	await phase({ start: 'Starting the local servers...', done: 'Started the local servers' }, async detail => {
		const timings: [string, number][] = []

		for (const server of dev.servers) {
			const started = Date.now()
			await server.start({ dispatch, log, reportFailure, env })
			timings.push([server.name, Date.now() - started])
		}

		detail(breakdown(timings))
	})

	// A worker that fails to boot must never take down the dev server:
	// the router, dashboard & watcher stay up, and the next invoke
	// rebuilds & retries.
	await phase({ start: 'Starting the bundle worker...', done: 'Started the bundle worker' }, async detail => {
		try {
			await worker.start()
		} catch (error) {
			// The failure marks the phase line instead of a false
			// "started" - the dev server stays up & the next invoke
			// rebuilds & retries.
			detail('FAILED - the next invoke retries')
			log(`The bundle worker failed to start: ${error instanceof Error ? error.message : String(error)}`)
			dirty = true
			restartNeeded = true
		}
	})

	// The app seed file runs on the first boot of the session, against
	// the fully wired environment - the dashboard reseed button runs
	// it again on demand.
	const seeder = createSeedRunner({ seed: appConfig.seed, env })
	const resetData = createDataReset({ pool: props.pool, stackConfigs })

	if (firstBoot && seeder.enabled && !dirty) {
		try {
			await phase({ start: 'Seeding the local data...', done: 'Seeded the local data' }, async () => {
				await seeder.run()
			})
		} catch (error) {
			log(`Seeding failed: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	const routers: { stop: () => Promise<void> }[] = []

	for (const [id, port] of Object.entries(routerPorts)) {
		routers.push(
			await startDevRouter({
				routes: dev.routes.filter(route => route.routerId === id),
				port,
				dispatch,
				onError(error, routeKey) {
					// Handler errors from web routes would otherwise never
					// print anywhere - the worker only returns them.
					const detail = error instanceof Error ? (error.stack ?? error.message) : String(error)

					process.stderr.write(`Route ${routeKey} failed: ${detail}\n`)

					emitWorkerLine(`Route ${routeKey} failed: ${detail}`, true, routeKey)
				},
			})
		)
	}

	const dashboardPort = props.port
	const dashboard = createDashboardServer({
		// The dashboard reseed resets every data store first, so the
		// seed lands on a known state.
		runSeeds:
			seeder.enabled
				? async () => {
						await resetData()
						await seeder.run()
					}
				: undefined,
		app: appConfig.name,
		region: appConfig.region,
		routerPorts,
		resources: dev.resources,
		routes: dev.routes,
		env,
		storeRoot: join(directories.output, 'local', 'store'),
		configFile: join(directories.output, 'local', 'config.json'),
		getEmails: () => props.pool.peek<{ server: { list: () => unknown[] } }>('shim:ses-email')?.server.list() ?? [],
		configPulled: Object.keys(props.pool.peek<Record<string, string>>('config:pull') ?? {}),
		auth: createAuthAdmin({
			appConfig,
			resolvedPools: () => props.pool.peek('auth:pull'),
		}),
		events: dev.events,
	})

	dashboard.connect(dispatch)
	await dashboard.listen(dashboardPort)

	// The source watcher marks the bundle dirty & kicks the rebuild in
	// the background right away, so the rebuild overlaps with the time
	// between saving & the next request instead of blocking it. Build
	// errors stay quiet here - the next invoke retries & surfaces them.
	const watcher = watch(directories.root, {
		ignored: ['**/node_modules/**', '**/.awsless/**', '**/dist/**', '**/.git/**', '**/*.stack.*', '**/app.json*'],
		ignoreInitial: true,
		awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
	})

	let rebuildTimer: ReturnType<typeof setTimeout> | undefined

	watcher.on('all', () => {
		dirty = true

		// Debounced, so a burst of saves triggers one rebuild - and a
		// save during an in-flight rebuild queues the next one.
		clearTimeout(rebuildTimer)
		rebuildTimer = setTimeout(() => {
			void ensureFresh().catch(error => {
				debug('Background rebuild failed', error)
			})
		}, 150)
	})

	// Files like the local config are only read during worker module
	// init, so a change just needs a worker restart, not a rebuild.
	const restartWatcher = dev.restartPaths.length > 0 ? watch(dev.restartPaths, { ignoreInitial: true }) : undefined

	restartWatcher?.on('all', () => {
		if (stopping) {
			return
		}

		void worker
			.restart()
			.then(() => log('Restarted the bundle worker.'))
			.catch(error => {
				// The next invoke retries through ensureFresh.
				restartNeeded = true
				dirty = true
				log(`The bundle worker failed to restart: ${error instanceof Error ? error.message : String(error)}`)
			})
	})

	return {
		dashboardPort,
		routerPorts,
		async stop() {
			stopping = true

			await rm(join(directories.output, 'local', 'env.json'), { force: true })
			clearTimeout(rebuildTimer)
			await watcher.close()
			await restartWatcher?.close()

			// An in-flight background rebuild finishes (or bails on the
			// stopping flag) before the teardown, so it can never respawn
			// workers after the stop.
			await fresh?.catch(() => {})

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
