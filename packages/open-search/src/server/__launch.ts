import { spawn } from 'child_process';
import { rm, stat } from 'fs/promises';
import { join } from 'path';
import { VersionArgs } from './version';

const exists = async (path:string) => {
	try {
		await stat(path)
	} catch(error) {
		return false
	}

	return true
}

export type Settings = Record<string, string | number | boolean>

const parseSettings = (settings: Settings) => {
	return Object.entries(settings).map(([key, value]) => {
		return [ '-E', `${key}=${value}` ]
	}).flat()
}

type Options = {
	path:string,
	host:string,
	port:number,
	debug?: boolean,
	version:VersionArgs
}

export const launch = ({ path, host, port, version, debug = false }:Options): Promise<() => Promise<void>> => {
	return new Promise(async (resolve, reject) => {
		const binary = join(path, 'opensearch-tar-install.sh')
		const child = spawn(binary, parseSettings(version.settings({ host, port })))

		const onError = (error:string) => fail(error)
		const onMessage = (message: Buffer) => {
			const line = message.toString('utf8').toLowerCase()

			if(debug) {
				console.log(line)
			}

			if(version.started(line)) {
				done()
			}
		}

		const kill = (): Promise<void> => {
			return new Promise((resolve) => {
				child.once(`exit`, () => {
					resolve()
				})

				child.kill()
			})
		}

		process.on('beforeExit', async () => {
			off()
			await kill()
			await cleanUp()
		})

		const cleanUp = async () => {
			const data = join(path, `data/${port}`)
			if(await exists(data)) {
				await rm(data, {
					recursive: true
				})
			}
		}

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
			// off()
			await cleanUp()
			resolve(kill)
		}

		const fail = async (error:string) => {
			off()
			await kill()
			await cleanUp()
			reject(new Error(error))
		}

		await cleanUp()
		on()
	})
}