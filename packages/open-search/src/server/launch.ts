import { spawn } from 'child_process'
import { rm, stat } from 'fs/promises'
import { join } from 'path'
import { findJavaHome } from './java'
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

export const parseSettings = (settings: Settings) => {
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
}

export const launch = ({ path, host, port, version, debug }: Options): Promise<() => Promise<void>> => {
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

		// The bundle ships an install script that wires up its own JDK; the
		// min distribution starts through bin/opensearch and needs a local
		// JDK 21+, which we resolve ourselves because an unset or stale
		// JAVA_HOME would otherwise break the boot.
		const binary =
			version.distribution === 'min'
				? join(path, 'bin/opensearch')
				: join(path, 'opensearch-tar-install.sh')

		const env = { ...process.env }

		// The tarballs only bundle a Linux JDK, so macOS needs a local one.
		if (process.platform === 'darwin') {
			const javaHome = await findJavaHome()

			if (javaHome) {
				env.OPENSEARCH_JAVA_HOME = javaHome
			}
		}

		if (version.distribution === 'bundle') {
			// Since 2.12 the bundle's install script refuses to run without
			// an initial admin password, even when the security plugin gets
			// disabled right after.
			env.OPENSEARCH_INITIAL_ADMIN_PASSWORD ??= 'Awsless-Mock-0penSearch!'
		}

		const child = spawn(binary, parseSettings(version.settings({ host, port, cache })), { env })

		const output: string[] = []

		const onError = (error: string) => fail(String(error))
		const onExit = (code: number | null) => {
			fail(`OpenSearch exited before starting (code ${code})\n${output.join('')}`)
		}
		const onMessage = (message: Buffer) => {
			const line = message.toString('utf8').toLowerCase()

			output.push(line)

			if (debug) {
				console.log(line)
			}

			if (version.started(line)) {
				done()
			}
		}

		const kill = async (): Promise<void> => {
			// The process may already be gone when a failed boot lands here,
			// and a dead child never emits another exit event.
			if (child.exitCode === null && !child.killed) {
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
