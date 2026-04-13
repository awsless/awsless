import jszip from 'jszip'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createDebugger } from '../../formation/debug.ts'
import { getProviderDownloadUrl, getProviderVersions, type Version } from './registry.ts'

const exists = async (file: string) => {
	try {
		await stat(file)
	} catch (error) {
		return false
	}

	return true
}

const debug = createDebugger('Downloader')

export const downloadPlugin = async (location: string, org: string, type: string, version: Version) => {
	if (version === 'latest') {
		const { latest } = await getProviderVersions(org, type)
		version = latest
	}

	const file = join(location, `${org}-${type}-${version}`)

	const exist = await exists(file)

	if (!exist) {
		debug(type, 'downloading...')
		const info = await getProviderDownloadUrl(org, type, version)
		const res = await fetch(info.url)
		const buf = await res.bytes()

		const zip = await jszip.loadAsync(buf)
		const zipped = zip.filter(file => file.startsWith('terraform-provider')).at(0)

		if (!zipped) {
			throw new Error(`Can't find the provider inside the downloaded zip file.`)
		}

		const binary = await zipped.async('nodebuffer')

		debug(type, 'done')

		await mkdir(location, { recursive: true })
		await writeFile(file, binary, {
			mode: 0o775,
		})
	} else {
		debug(type, 'already downloaded')
	}

	return {
		file,
		version,
	}
}
