import { spawn } from 'child_process'
import { rm, mkdir } from 'fs/promises'
import { join } from 'path'
import { VersionArgs } from './version'

export const launch = async ({
	path,
	host,
	port,
	version,
	debug = false,
}: {
	path: string
	host: string
	port: number
	debug?: boolean
	version: VersionArgs
}): Promise<() => Promise<void>> => {
	const cacheDir = join(path, 'cache', String(port))

	await rm(cacheDir, { recursive: true, force: true })
	await mkdir(cacheDir, { recursive: true })

	const binary = join(path, 'bin/mysqld')

	const killInit = await spawnProcess({
		debug,
		binary,
		args: [
			'--initialize-insecure',
			'--explicit_defaults_for_timestamp',
			`--basedir=${path}`,
			`--datadir=${cacheDir}/data`,
		],
		assertStarted: (line: string) => line.includes('shutting down mysqld'),
	})

	await killInit()

	return spawnProcess({
		debug,
		binary,
		args: [
			// `--bind-address=${host}`,
			// `--port=${port}`,
			// `--basedir=${path}`,
			// `--datadir=${cacheDir}/data`,
			'--explicit_defaults_for_timestamp',
			...Object.entries(version.settings({ port, host, cacheDir })).map(
				([key, value]) => `--${key}=${value}`
			),
		],
		assertStarted: version.started,
		cleanup: async () =>
			await rm(cacheDir, {
				recursive: true,
				force: true,
				maxRetries: 100,
				retryDelay: 50,
			}),
	})
}

const spawnProcess = ({
	debug = false,
	binary,
	args,
	assertStarted,
	cleanup,
}: {
	debug: boolean
	binary: string
	args: string[]
	assertStarted: Function
	cleanup?: Function
}): Promise<() => Promise<void>> => {
	return new Promise(async (resolve, reject) => {
		const child = spawn(binary, args)

		const onError = (error: string) => fail(error)
		const onMessage = (message: Buffer) => {
			const line = message.toString('utf8').toLowerCase()

			if (debug) {
				console.log(line)
			}

			if (assertStarted(line)) {
				done()
			}
		}

		const kill = async (): Promise<void> => {
			await new Promise(async resolve => {
				if (cleanup) await cleanup()

				child.once(`exit`, () => {
					resolve(void 0)
				})
				child.kill()
			})
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
