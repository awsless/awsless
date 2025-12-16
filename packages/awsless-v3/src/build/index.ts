import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { directories } from '../util/path.js'
import { createTimer } from '../util/timer.js'
import { Workspace } from '@awsless/ts-file-cache'

export type Cache = { version: string; data: Metadata }
export type Metadata = Record<string, string | number | boolean> | undefined | void
export type Write = (file: string, data: Buffer | string) => Promise<void>
export type BuildCallback = (write: Write) => Promise<Metadata>
export type Build = (fingerprint: string, callback: BuildCallback) => Promise<Metadata>
export type Builder = (build: Build, props: BuildProps) => Promise<Metadata>
export type BuildProps = {
	workspace: Workspace
}

const readCache = async (file: string) => {
	try {
		const value = await readFile(file, 'utf8')

		return JSON.parse(value) as Cache
	} catch (_) {
		return undefined
	}
}

const writeCache = async (file: string, version: string, data: Metadata) => {
	const cache = JSON.stringify({ version, data })

	const base = dirname(file)
	await mkdir(base, { recursive: true })

	await writeFile(file, cache, 'utf8')
}

export const getBuildPath = (type: string, name: string, file: string) => {
	return join(directories.build, type, name, file)
}

export const build = (type: string, name: string, builder: Builder, props: BuildProps) => {
	return builder(async (version, callback) => {
		const cacheFile = getBuildPath(type, name, 'cache.json')
		const cache = await readCache(cacheFile)

		if (cache && cache.version === version && !process.env.NO_CACHE) {
			return {
				...cache.data,
				cached: true,
			}
		}

		const time = createTimer()
		const meta = await callback(async (file, data) => {
			const path = getBuildPath(type, name, file)
			const base = dirname(path)

			await mkdir(base, { recursive: true })
			await writeFile(path, data)
		})

		const data = { ...meta, buildTime: time() }

		await writeCache(cacheFile, version, data)

		return {
			...data,
			cached: false,
		}
	}, props)
}
