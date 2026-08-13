import { log } from '@awsless/clui'
import { Command } from 'commander'
import { AppConfig } from '../../config/app.js'
import { watchConfig } from '../../config/load/watch.js'
import { StackConfig } from '../../config/stack.js'
import { DevInstance, startDev } from '../../dev/index.js'
import { createServerPool } from '../../dev/pool.js'
import { createTimer } from '../../util/timer.js'
import { buildTypes } from '../ui/complex/build-types.js'
import { layout } from '../ui/complex/layout.js'
import { logError } from '../ui/error/error.js'
import { color } from '../ui/style.js'

export const dev = (program: Command) => {
	program
		.command('dev')
		.description('Start the development service')
		.option('--port <port>', 'The port for the local router', '3000')
		.action(async (options: { port: string }) => {
			await layout('dev', async props => {
				await buildTypes(props)

				const port = Number(options.port)

				// Heavy local servers survive config restarts through the
				// pool - the dev command owns its final shutdown.
				const pool = createServerPool()
				let instance: DevInstance | undefined
				let resolveShutdown: () => void
				const shutdown = new Promise<void>(resolve => {
					resolveShutdown = resolve
				})

				// Some local servers pull in libraries (like async-on-exit
				// via redis-memory-server) that exit the process straight
				// from their own signal handlers, killing the graceful
				// stop. The dev command owns shutdown, so it claims the
				// signals after every start.
				const claimSignals = () => {
					process.removeAllListeners('SIGINT')
					process.removeAllListeners('SIGTERM')
					process.once('SIGINT', () => resolveShutdown())
					process.once('SIGTERM', () => resolveShutdown())
				}

				const start = async (appConfig = props.appConfig, stackConfigs = props.stackConfigs) => {
					// During the boot every progress message updates the
					// current phase spinner - afterwards runtime messages log
					// as steps.
					let logger: (message: string) => void = message => log.step(message)

					// Every boot phase renders as its own task line with its
					// duration, so a slow start points at its phase.
					const phase = async <T>(
						titles: { start: string; done: string },
						fn: (detail: (text: string) => void) => Promise<T>
					) => {
						const time = createTimer()
						let detail = ''

						return log.task({
							initialMessage: titles.start,
							errorMessage: `${titles.start.replace(/\.\.\.$/, '')} failed.`,
							task: ({ updateMessage, updateSuccessMessage }) => {
								logger = updateMessage

								return fn(text => (detail = text))
									.then(result => {
										updateSuccessMessage(
											`${titles.done} in ${time()}${detail ? color.dim(` (${detail})`) : ''}`
										)
										return result
									})
									.finally(() => {
										logger = message => log.step(message)
									})
							},
						})
					}

					instance = await startDev({
						appConfig,
						stackConfigs,
						port,
						pool,
						phase,
						onLog(message) {
							logger(message)
						},
					})

					log.success('Local dev environment ready.')

					log.list('Endpoints', {
						Dashboard: color.info(`http://localhost:${instance.dashboardPort}`),
						...Object.fromEntries(
							Object.entries(instance.routerPorts).map(([id, routerPort]) => [
								`Router ${id}`,
								color.info(`http://localhost:${routerPort}`),
							])
						),
					})

					claimSignals()
				}

				await start()

				// Config restarts run strictly one at a time: two quick saves
				// would otherwise stop & start concurrently against the same
				// ports. A save landing mid-restart queues exactly one
				// follow-up, always with the latest config.
				let queuedConfig: { appConfig: AppConfig; stackConfigs: StackConfig[] } | undefined
				let restartRun: Promise<void> = Promise.resolve()
				let restarting = false

				const runRestarts = () => {
					if (restarting) {
						return
					}

					restarting = true
					restartRun = (async () => {
						try {
							while (queuedConfig) {
								const config = queuedConfig
								queuedConfig = undefined

								try {
									await buildTypes({ ...props, ...config })
									await instance?.stop()
									await start(config.appConfig, config.stackConfigs)
								} catch (error) {
									logError(error)
								}
							}
						} finally {
							restarting = false
						}
					})()
				}

				// A config change can add or remove resources, so the whole
				// dev environment restarts with the fresh config.
				await watchConfig(
					props.options,
					({ appConfig, stackConfigs }) => {
						queuedConfig = { appConfig, stackConfigs }
						runRestarts()
					},
					error => {
						logError(error)
					}
				)

				// idle until a signal asks for the graceful stop...
				await shutdown

				// A restart caught mid-flight finishes first, so the stop
				// below never races a concurrent start.
				queuedConfig = undefined
				await restartRun
				await instance?.stop()
				await pool.stopAll()

				// The monkey patched process.exit of the exit libraries
				// still runs their own cleanup chain.
				process.exit(0)
			})
		})
}
