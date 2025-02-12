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

		// console.log(join(path, 'jdk'))

		const binary = join(path, 'opensearch-tar-install.sh')
		const child = spawn(
			// `export OPENSEARCH_JAVA_HOME=${join(path, 'jdk')}; ${binary}`,
			binary,
			parseSettings(version.settings({ host, port, cache }))
			// {
			// 	env: {
			// 		OPENSEARCH_JAVA_HOME: join(path, 'jdk'),
			// 	},
			// }
		)
		// const child = spawn('opensearch', parseSettings(version.settings({ host, port, cache })))

		const onError = (error: string) => fail(error)
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
			await new Promise(resolve => {
				child.once(`exit`, () => {
					resolve(void 0)
				})

				child.kill()
			})

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
		}

		const on = () => {
			child.stderr.on('data', onMessage)
			child.stdout.on('data', onMessage)
			child.on('error', onError)
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
