import { spawn } from 'child_process'
import { rm, stat } from 'fs/promises'
import { join } from 'path'
import { VersionArgs } from './version'
// import findCacheDir from 'find-cache-dir';

const exists = async (path: string) => {
	try {
		await stat(path)
	} catch (error) {
		return false
	}

	return true
}

export type Settings = Record<string, string | number | boolean>

const parseSettings = (settings: Settings) => {
	return Object.entries(settings)
		.map(([key, value]) => {
			return ['-E', `${key}=${value}`]
		})
		.flat()
}

type Options = {
	path: string
	host: string
	port: number
	debug?: boolean
	version: VersionArgs

	// Run the bundle with a different jdk than the bundled one, for
	// platforms the bundle doesn't ship a native jdk for.
	javaHome?: string
}

export const launch = ({ path, host, port, version, debug, javaHome }: Options): Promise<() => Promise<void>> => {
	return new Promise(async (resolve, reject) => {
		const cache = join(path, 'cache', String(port))

		const cleanUp = async () => {
			if (await exists(cache)) {
				await rm(cache, {
					recursive: true,
				})
			}
		}

		await cleanUp()

		// console.log(join(path, 'jdk'))

		// With a custom jdk we skip the tar install script & run the
		// opensearch binary directly, so the bundled linux jdk never runs.
		const binary = javaHome ? join(path, 'bin', 'opensearch') : join(path, 'opensearch-tar-install.sh')
		const child = spawn(
			binary,
			parseSettings(version.settings({ host, port, cache })),
			javaHome
				? {
						env: {
							...process.env,
							OPENSEARCH_JAVA_HOME: javaHome,
						},
					}
				: {}
		)
		// const child = spawn('opensearch', parseSettings(version.settings({ host, port, cache })))

		const onError = (error: string) => fail(error)
		// A child that starts & dies before opensearch reports started
		// must reject, instead of hanging the launch promise forever.
		const onExit = (code: number | null) => fail(`OpenSearch exited with code ${code} during startup.`)
		const onMessage = (message: Buffer) => {
			const line = message.toString('utf8').toLowerCase()

			if (debug) {
				console.log(line)
			}

			if (version.started(line)) {
				done()
			}
		}

		const kill = async (): Promise<void> => {
			// The child may already be dead, like from the terminal group
			// signal of a ctrl-c - node then keeps exitCode null with
			// signalCode set, and waiting for its exit would hang forever.
			if (child.exitCode === null && child.signalCode === null) {
				await new Promise(resolve => {
					child.once(`exit`, () => {
						resolve(void 0)
					})

					child.kill()
				})
			}

			await cleanUp()
		}

		process.on('beforeExit', async () => {
			off()
			await kill()
		})

		const off = () => {
			child.stderr.off('data', onMessage)
			child.stdout.off('data', onMessage)
			child.off('error', onError)
			child.off('exit', onExit)
		}

		const on = () => {
			child.stderr.on('data', onMessage)
			child.stdout.on('data', onMessage)
			child.on('error', onError)
			child.on('exit', onExit)
		}

		const done = async () => {
			off()
			resolve(kill)
		}

		const fail = async (error: string) => {
			off()
			await kill()
			reject(new Error(error))
		}

		on()
	})
}
