import { createHash } from 'crypto'
import { mkdir, rename, rm, stat } from 'fs/promises'
import { join, resolve } from 'path'
import decompress from 'decompress'
import findCacheDir from 'find-cache-directory'
import { Version, VersionArgs } from './version'

const getArchiveName = (version: Version): string => {
	const name = `opensearch-min-${version}`

	switch (process.platform) {
		case 'win32':
			return `${name}-windows-arm64.zip`
		default:
			return `${name}-linux-x64.tar.gz`
	}
}

const getDownloadUrl = (version: Version): string => {
	return `https://artifacts.opensearch.org/releases/core/opensearch/${version}/${getArchiveName(version)}`
}

const getDownloadPath = (): string => {
	return resolve(
		findCacheDir({
			name: '@awsless/open-search',
			cwd: process.cwd(),
		}) || ''
	)
}

const exists = async (path: string) => {
	try {
		await stat(path)
	} catch (error) {
		return false
	}

	return true
}

export const download = async ({ version }: Pick<VersionArgs, 'version'>) => {
	const path = join(getDownloadPath(), 'min')
	const name = `opensearch-${version}`
	const file = join(path, name)

	if (await exists(file)) {
		return file
	}

	console.log(`Downloading OpenSearch ${version}`)

	const url = getDownloadUrl(version)
	const response = await fetch(url, { method: 'GET' })

	if (!response.ok) {
		throw new Error(`Downloading OpenSearch failed with status ${response.status}: ${url}`)
	}

	const data = await response.arrayBuffer()
	const buffer = Buffer.from(data)

	// OpenSearch publishes a sha512 for every artifact.
	const checksumResponse = await fetch(`${url}.sha512`, { method: 'GET' })

	if (!checksumResponse.ok) {
		throw new Error(
			`Downloading the OpenSearch checksum failed with status ${checksumResponse.status}: ${url}.sha512`
		)
	}

	const checksum = (await checksumResponse.text()).split(/\s+/)[0]
	const digest = createHash('sha512').update(buffer).digest('hex')

	if (digest !== checksum) {
		throw new Error(`The OpenSearch archive doesn't match its published sha512 checksum: ${url}`)
	}

	// Parallel test workers can race on a cold cache, so extract into a
	// process-unique staging directory and atomically rename the result
	// into place. The loser of the race just discards its copy.
	const staging = join(path, `staging-${process.pid}`)

	await mkdir(staging, { recursive: true, mode: '0777' })
	await decompress(buffer, staging)

	try {
		await rename(join(staging, name), file)
	} catch (error) {
		// Another worker already put the directory in place.
		if (!(await exists(file))) {
			throw error
		}
	}

	await rm(staging, { recursive: true, force: true })

	return file
}
