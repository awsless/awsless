import { spawn } from 'child_process'
import { rm, stat } from 'fs/promises'
import { join } from 'path'
import { findJavaHome } from './java'
import { VersionArgs } from './version'
// import findCacheDir from 'find-cache-dir';

const exists = async (path: string) => {
	try {
		await stat(path)
	} catch {
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
	// Fires when the server dies after a successful start without the
	// returned kill being asked - the local dev environment surfaces it
	// on the health strip.
	onExit?: (code: number | null, signal: string | null) => void
	// Streams the server output after a successful start, for the local
	// dev dashboard's log view.
	onOutput?: (line: string) => void
}

export const launch = async ({
	path,
	host,
	port,
	version,
	debug,
	onExit: onDied,
	onOutput,
}: Options): Promise<() => Promise<void>> => {
	const cache = join(path, 'cache', String(port))

	const cleanUp = async () => {
		if (await exists(cache)) {
			await rm(cache, {
				recursive: true,
			})
		}
	}

	await cleanUp()

	// The min distribution needs a local JDK 21+, which we resolve
	// ourselves because an unset or stale JAVA_HOME would otherwise
	// break the boot.
	const binary = join(path, 'bin/opensearch')

	const env = { ...process.env }

	// The tarball only bundles a Linux JDK, so macOS needs a local one.
	if (process.platform === 'darwin') {
		const javaHome = await findJavaHome()

		if (!javaHome) {
			throw new Error('No local JDK 21+ found to run OpenSearch. Install one with "brew install openjdk".')
		}

		env.OPENSEARCH_JAVA_HOME = javaHome
	}

	return new Promise((resolve, reject) => {
		const child = spawn(binary, parseSettings(version.settings({ host, port, cache })), { env })

		const output: string[] = []

		const onError = (error: string) => void fail(error)
		const onExit = (code: number | null) => {
			void fail(`OpenSearch exited before starting (code ${code})\n${output.join('')}`)
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

		let stopping = false

		const kill = async (): Promise<void> => {
			stopping = true

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

		const done = () => {
			off()

			// The startup listeners are gone - from here an exit is a
			// crash, unless the returned kill asked for it.
			child.once('exit', (code, signal) => {
				if (!stopping) {
					onDied?.(code, signal)
				}
			})

			if (onOutput) {
				const capture = (chunk: Buffer) => {
					for (const line of chunk.toString().split('\n')) {
						if (line.trim() !== '') {
							onOutput(line)
						}
					}
				}

				child.stdout.on('data', capture)
				child.stderr.on('data', capture)
			}

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
