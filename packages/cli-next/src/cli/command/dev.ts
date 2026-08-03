import { log } from '@awsless/clui'
import { Command } from 'commander'
import { watchConfig } from '../../config/load/watch.js'
import { DevInstance, startDev } from '../../dev/index.js'
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
					// During the boot every progress message updates the task
					// spinner - afterwards runtime messages log as steps.
					let logger: (message: string) => void = message => log.step(message)

					instance = await log.task({
						initialMessage: 'Starting the local dev environment...',
						successMessage: 'Local dev environment ready.',
						errorMessage: 'Failed to start the local dev environment.',
						task: ({ updateMessage }) => {
							logger = updateMessage

							return startDev({
								appConfig,
								stackConfigs,
								port,
								onLog(message) {
									logger(message)
								},
							}).finally(() => {
								logger = message => log.step(message)
							})
						},
					})

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

				// A config change can add or remove resources, so the whole
				// dev environment restarts with the fresh config.
				await watchConfig(
					props.options,
					async ({ appConfig, stackConfigs }) => {
						try {
							await buildTypes({ ...props, appConfig, stackConfigs })
							await instance?.stop()
							await start(appConfig, stackConfigs)
						} catch (error) {
							logError(error)
						}
					},
					error => {
						logError(error)
					}
				)

				// idle until a signal asks for the graceful stop...
				await shutdown
				await instance?.stop()

				// The monkey patched process.exit of the exit libraries
				// still runs their own cleanup chain.
				process.exit(0)
			})
		})
}
