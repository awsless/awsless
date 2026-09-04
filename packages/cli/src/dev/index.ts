import { watch } from 'fs'
import { mkdir, rm, writeFile } from 'fs/promises'
import { basename, dirname, join } from 'path'
import { loadWorkspace } from '@awsless/ts-file-cache'
import { constantCase } from 'change-case'
import { createApp } from '../app.js'
import { build, getBuildPath } from '../build/index.js'
import { debug, setDebugSink } from '../cli/debug.js'
import { AppConfig } from '../config/app.js'
import { StackConfig } from '../config/stack.js'
import { DevTrace } from '../feature.js'
import { createAuthAdmin } from '../feature/auth/dev.js'
import { ROUTE_HEADER } from '../feature/bundle/util.js'
import { features } from '../feature/index.js'
import { getBundleFunctionName } from '../util/name.js'
import { directories, useDevBuildDir } from '../util/path.js'
import { reapOrphanedDevChildren } from './children.js'
import { createDevContext } from './context.js'
import { createDashboardServer } from './dashboard/index.js'
import { createFailureReporter } from './failure.js'
import { ServerPool } from './pool.js'
import { createDataReset } from './reset.js'
import { startDevRouter } from './router.js'
import { linkSdkPackages } from './sdk.js'
import { createSeedRunner } from './seed.js'
import { createBlockedServer } from './servers/blocked.js'
import { createLambdaServer } from './servers/lambda.js'
import {
	formatTraceHeader,
	isConfigFile,
	isIgnoredPath,
	LOCAL_ACCOUNT_ID,
	traceId,
	watchdogPath,
	WATCHDOG_SOURCE,
} from './util.js'
import { BundleWorker, createBundleWorker } from './worker.js'

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
	const slow = timings.filter(([, ms]) => ms >= 100).toSorted((a, b) => b[1] - a[1])

	return slow
		.map(([name, ms]) => `${name} ${ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`}`)
		.join(', ')
}

// The rebuild & worker restart bookkeeping, apart from startDev so its
// ordering rules have a unit test.
export const createReloadController = (props: {
	// Runs every builder & resolves whether any output changed.
	build: () => Promise<boolean>
	worker: Pick<BundleWorker, 'restart' | 'size'>
	log: (message: string) => void
	reportHealth: (status: 'up' | 'down', detail?: string) => void
	debug?: (message: string) => void
}) => {
	// Source changes never rebuild eagerly: the next invoke loads the
	// fresh code, while config changes restart the whole environment.
	let dirty = false

	// Every dispatch waits for the rebuild or restart in flight, so no
	// request lands between a pool's stop & its start.
	let fresh: Promise<void> | undefined

	// A stopping environment must never respawn workers, or a rebuild
	// racing the shutdown would orphan node children.
	let stopping = false

	// A failed worker (re)start keeps the restart owed, so a later pass
	// with fully cached builds still brings the worker up.
	let restartNeeded = false

	// Rebuilds & restarts run one at a time, chained behind whatever is
	// already in flight.
	const runFresh = (action: () => Promise<void>) => {
		const previous = fresh ?? Promise.resolve()
		const run: Promise<void> = previous
			.catch(() => {})
			.then(action)
			.finally(() => {
				if (fresh === run) {
					fresh = undefined
				}
			})

		fresh = run

		return run
	}

	const restartWorkers = async () => {
		restartNeeded = true
		await props.worker.restart()
		restartNeeded = false
		props.reportHealth('up', String(props.worker.size()))
	}

	const rebuild = async () => {
		dirty = false
		const started = Date.now()

		try {
			if (stopping) {
				return
			}

			const changed = await props.build()
			const built = Date.now()

			// A re-save without changes skips the worker restart.
			if ((changed || restartNeeded) && !stopping) {
				await restartWorkers()

				props.log(
					`Reloaded the bundle in ${Date.now() - started}ms (build ${built - started}ms, worker ${Date.now() - built}ms)`
				)
			} else if (!changed) {
				props.debug?.(`Rebuild found no changes in ${Date.now() - started}ms`)
			}
		} catch (error) {
			// Retry on the next invoke.
			dirty = true
			props.reportHealth('down', error instanceof Error ? error.message : String(error))
			throw error
		}
	}

	const ensureFresh = async (): Promise<void> => {
		if (fresh) {
			await fresh

			// A save during the wait marked the bundle dirty again.
			return ensureFresh()
		}

		if (!dirty) {
			return
		}

		await runFresh(rebuild)
	}

	return {
		markDirty: () => {
			dirty = true
		},
		isDirty: () => dirty,
		ensureFresh,
		// An empty pool restarts on the next invoke, through the same
		// path a failed boot takes.
		onCrash: ({ code, size }: { code: number | null; size: number }) => {
			if (stopping) {
				return
			}

			props.log(`A bundle worker crashed (exit code ${code}), ${size} left.`)
			props.reportHealth(size > 0 ? 'up' : 'down', size > 0 ? String(size) : 'all workers crashed')

			if (size === 0) {
				restartNeeded = true
				dirty = true
			}
		},
		bootFailed: (error: unknown) => {
			props.log(`The bundle worker failed to start: ${error instanceof Error ? error.message : String(error)}`)
			props.reportHealth('down', error instanceof Error ? error.message : String(error))
			dirty = true
			restartNeeded = true
		},
		// Files read only during worker module init (like the local
		// config) need a restart, not a rebuild - through the same slot,
		// so dispatches wait instead of failing on the stopped pool.
		restartWorker: () => {
			if (stopping) {
				return
			}

			void runFresh(async () => {
				if (stopping) {
					return
				}

				await restartWorkers()
				props.log('Restarted the bundle worker.')
			}).catch(error => {
				// The next invoke retries through ensureFresh.
				dirty = true
				props.reportHealth('down', error instanceof Error ? error.message : String(error))
				props.log(
					`The bundle worker failed to restart: ${error instanceof Error ? error.message : String(error)}`
				)
			})
		},
		// An in-flight rebuild finishes (or bails on the stopping flag)
		// before the teardown, so it can never respawn workers after.
		stop: async () => {
			stopping = true
			await fresh?.catch(() => {})
		},
	}
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
	const startedAt = Date.now()

	// Isolate the dev builds from deploy/build/test runs in the same
	// repo - see useDevBuildDir. Must happen before any builder runs.
	useDevBuildDir()

	// A hard-killed previous run can't clean up after itself, so its
	// surviving children die here, before their ports are needed again.
	const reaped = await reapOrphanedDevChildren()

	if (reaped > 0) {
		debug(`Reaped ${reaped} orphaned dev child processes`)
	}

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

	// The parent watchdog preload for long lived children: a child that
	// outlives a hard-killed dev server exits on its own, without
	// waiting for the next boot's pid file reaper.
	await writeFile(watchdogPath(), WATCHDOG_SOURCE)

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
	await props.pool.keep('session', null, async () => ({
		value: true,
		stop: () => {},
	}))

	const dev = createDevContext({
		appConfig,
		stackConfigs,
		appId,
		routerPorts,
		log,
		pool: props.pool,
	})

	// The dev server's own debug stream (build timings, sdk links, seed
	// output) feeds the dashboard's Logs page alongside the worker
	// output - set per run, so restarts never stack listeners.
	setDebugSink((type, message) => {
		dev.events.emit('debug', {
			date: Date.now(),
			line: message,
			error: type === 'error',
		})
	})

	const bundleName = getBundleFunctionName(appConfig.name)
	const buildDir = getBuildPath('bundle', bundleName, '.')

	// The first run may download local servers like opensearch or redis,
	// which the feature hooks report through the boot task spinner.
	const { env, lambda } = await phase(
		{
			start: 'Preparing the local resources...',
			done: 'Prepared the local resources',
		},
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
				const server = createBlockedServer({
					onLog: message => debug(message),
				})
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
	const sorted = [...builders].toSorted((a, b) => Number(a.type === 'bundle') - Number(b.type === 'bundle'))

	// The workspace scan only depends on boot stable state, so one scan
	// serves every rebuild instead of blocking each one.
	let workspace!: Awaited<ReturnType<typeof loadWorkspace>>

	const buildAll = async () => {
		let changed = false

		for (const builder of sorted) {
			const meta = await build(builder.type, builder.name, builder.builder, {
				workspace,
			})

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
		await linkSdkPackages(workspace, buildDir, log)

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

	// A big seed would bury the boot output, so its handler logs stay
	// off the terminal - the dashboard Logs feed still gets them.
	let seeding = false

	// The local servers outlive the worker, so their teardown dispatches
	// fail on an empty pool - reporting that says nothing.
	let stopping = false

	const worker = createBundleWorker({
		buildDir,
		env,
		functionName: bundleName,
		quiet: () => seeding,
		onOutput: (line, stream, route) => emitWorkerLine(line, stream === 'stderr', route),
		onCrash: info => reload.onCrash(info),
	})

	const reload = createReloadController({
		build: buildAll,
		worker,
		log,
		debug: message => debug(message),
		reportHealth: (status, detail) => dev.context.reportHealth('workers', status, detail),
	})

	dev.resources.push({
		kind: 'worker',
		id: 'bundle',
		channel: 'worker',
		detail: 'The output & errors of the local bundle worker',
	})

	// A readable label for the homepage activity feed, derived from the
	// dispatched event's shape.
	const describeDispatch = (event: unknown): string => {
		const payload = event as Record<string, any>
		const route = payload?.['$awsless-route']

		if (typeof route === 'string') {
			return route
		}

		const record = payload?.Records?.[0]

		if (record?.eventSource === 'aws:sqs') {
			return (
				'queue ' +
				String(record.eventSourceARN ?? '')
					.split(':')
					.at(-1)
			)
		}

		if (record?.EventSource === 'aws:sns') {
			return (
				'topic ' +
				String(record.Sns?.TopicArn ?? '')
					.split(':')
					.at(-1)
			)
		}

		if (record?.eventSource === 'aws:s3') {
			return 'store ' + String(record.s3?.bucket?.name ?? '')
		}

		if (String(record?.eventSourceARN ?? '').includes(':dynamodb:')) {
			return 'stream ' + (String(record.eventSourceARN).split('table/')[1]?.split('/')[0] ?? 'table')
		}

		const header = payload?.headers?.[ROUTE_HEADER]

		if (typeof header === 'string') {
			return header
		}

		return 'invoke'
	}

	// The payload for the activity feed: route payloads unwrap their
	// envelope, everything else shows as is, cut to a readable size.
	const describePayload = (event: unknown): string => {
		let payload = ''

		try {
			const envelope = event as Record<string, unknown>
			const inner = typeof envelope?.['$awsless-route'] === 'string' ? envelope.event : event

			payload = JSON.stringify(inner) ?? ''
		} catch {}

		return payload.length > 1000 ? payload.slice(0, 1000) + '\u2026' : payload
	}

	// Every dispatch lands on the homepage activity feed - the bus replay
	// gives a freshly opened page the recent history.
	const dispatch = async (event: unknown, parent?: DevTrace) => {
		await reload.ensureFresh()

		const started = Date.now()
		const route = describeDispatch(event)
		const payload = describePayload(event)

		// Every dispatch is one span of a trace. A dispatch caused by a
		// running handler (a queue send, a task invoke) joins its caller's
		// trace as a child span - everything else starts a new trace.
		const trace: DevTrace = {
			traceId: parent?.traceId ?? traceId(),
			spanId: traceId(),
		}

		try {
			const result = await worker.dispatch(event, formatTraceHeader(trace))

			dev.events.emit('activity', {
				date: started,
				route,
				payload,
				ms: Date.now() - started,
				ok: true,
				trace: trace.traceId,
				span: trace.spanId,
				parent: parent?.spanId,
			})

			return result
		} catch (error) {
			// The failure reporter picks the span off the error, so the
			// on-failure consumer dispatch lands in the same trace.
			if (error instanceof Error) {
				;(error as Error & { trace?: DevTrace }).trace = trace
			}

			dev.events.emit('activity', {
				date: started,
				route,
				payload,
				ms: Date.now() - started,
				ok: false,
				error: error instanceof Error ? error.message : String(error),
				trace: trace.traceId,
				span: trace.spanId,
				parent: parent?.spanId,
			})

			throw error
		}
	}

	// Failed async consumers route to the on-failure consumer when the
	// app has one, instead of retry & dlq machinery. Every failure also
	// lands on the homepage problems feed.
	const report = createFailureReporter({
		enabled: Boolean(appConfig.onFailure),
		dispatch,
		log,
		onReport(report) {
			dev.events.emit('problems', {
				date: Date.now(),
				kind: report.kind,
				title: report.routeKey ?? report.queue?.name ?? 'async invoke',
				detail: report.error instanceof Error ? report.error.message : String(report.error),
			})
		},
	})

	const reportFailure: typeof report = failure => {
		if (stopping) {
			return
		}

		report(failure)
	}

	// Local resource servers already listen since their onDev hook ran,
	// so the worker module init can talk to them right away. Their
	// dispatch only fires in reaction to traffic, so the worker is
	// always up by then.
	lambda.connect(dispatch, reportFailure)

	await phase(
		{
			start: 'Starting the local servers...',
			done: 'Started the local servers',
		},
		async detail => {
			const timings: [string, number][] = []

			for (const server of dev.servers) {
				const started = Date.now()
				await server.start({ dispatch, log, reportFailure, env })
				timings.push([server.name, Date.now() - started])
			}

			detail(breakdown(timings))
		}
	)

	// A worker that fails to boot must never take down the dev server:
	// the router, dashboard & watcher stay up, and the next invoke
	// rebuilds & retries.
	await phase(
		{
			start: 'Starting the bundle worker...',
			done: 'Started the bundle worker',
		},
		async detail => {
			try {
				await worker.start()
				dev.context.reportHealth('workers', 'up', String(worker.size()))
			} catch (error) {
				// The phase line shows the failure instead of a false
				// "started" - the next invoke rebuilds & retries.
				detail('FAILED - the next invoke retries')
				reload.bootFailed(error)
			}
		}
	)

	// The app seed file runs on the first boot of the session, against
	// the fully wired environment - the dashboard reseed button runs
	// it again on demand.
	const seeder = createSeedRunner({ seed: appConfig.seed, env })
	const resetData = createDataReset({ pool: props.pool, stackConfigs })

	const runSeed = async () => {
		seeding = true

		try {
			await seeder.run()
		} finally {
			seeding = false
		}
	}

	if (firstBoot && seeder.enabled && !reload.isDirty()) {
		try {
			await phase({ start: 'Seeding the local data...', done: 'Seeded the local data' }, async () => {
				await runSeed()
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

					dev.events.emit('problems', {
						date: Date.now(),
						kind: 'route',
						title: routeKey,
						detail: error instanceof Error ? error.message : String(error),
					})
				},
			})
		)
	}

	const dashboardPort = props.port
	const dashboard = createDashboardServer({
		// The dashboard reseed resets every data store first, so the
		// seed lands on a known state.
		runSeeds: seeder.enabled
			? async () => {
					await resetData()
					await runSeed()
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
		getAlerts: () => props.pool.peek<{ alerts: unknown[] }>('shim:sns')?.alerts ?? [],
		getSession: () => ({ startedAt, workers: worker.size() }),
		getHealth: () => [...dev.health.values()],
		configPulled: Object.keys(props.pool.peek<Record<string, string>>('config:pull') ?? {}),
		auth: createAuthAdmin({
			appConfig,
			resolvedPools: () => props.pool.peek('auth:pull'),
		}),
		events: dev.events,
	})

	dashboard.connect(dispatch)
	await dashboard.listen(dashboardPort)

	// The rebuild starts right away so it overlaps with the time until
	// the next request. Native recursive watch: chokidar arms a watcher
	// per directory & starves the dev servers on big projects.
	let rebuildTimer: ReturnType<typeof setTimeout> | undefined

	const watcher = watch(directories.root, { recursive: true }, (_event, filename) => {
		if (!filename || isIgnoredPath(filename)) {
			return
		}

		// Config saves restart the whole environment through the config
		// watcher, so a rebuild here would only be thrown away.
		if (isConfigFile(filename)) {
			return
		}

		reload.markDirty()

		// Debounced, so a burst of saves triggers one rebuild - and a
		// save during an in-flight rebuild queues the next one.
		clearTimeout(rebuildTimer)
		rebuildTimer = setTimeout(() => {
			// Build errors stay quiet here - the next invoke surfaces them.
			void reload.ensureFresh().catch(error => {
				debug('Background rebuild failed', error)
			})
		}, 150)
	})

	// The restart paths may not exist yet & the native watch throws on
	// missing paths, so each parent directory is watched instead.
	const restartWatchers: ReturnType<typeof watch>[] = []

	for (const path of dev.restartPaths) {
		await mkdir(dirname(path), { recursive: true })

		restartWatchers.push(
			watch(dirname(path), (_event, filename) => {
				if (filename === basename(path)) {
					reload.restartWorker()
				}
			})
		)
	}

	return {
		dashboardPort,
		routerPorts,
		async stop() {
			stopping = true

			await rm(join(directories.output, 'local', 'env.json'), { force: true })
			clearTimeout(rebuildTimer)
			watcher.close()

			for (const restartWatcher of restartWatchers) {
				restartWatcher.close()
			}

			await reload.stop()

			for (const router of routers) {
				await router.stop()
			}

			await dashboard.stop()

			// The worker stops before the local resource servers, so its
			// open connections never retry against dead servers.
			await worker.stop()

			// Reverse registration order, so dependent servers stop
			// before the servers they rely on.
			for (const server of dev.servers.toReversed()) {
				await server.stop?.()
			}
		},
	}
}
