import decompress from 'decompress'
import findCacheDir from 'find-cache-dir'
import { mkdir, rename, rm, stat } from 'fs/promises'
import { join, resolve } from 'path'
import { Distribution, Version, VersionArgs } from './version'
// import { exec } from 'child_process';
// import { promisify } from 'util';

const getArchiveName = (version: Version, distribution: Distribution): string => {
	const name = distribution === 'min' ? `opensearch-min-${version}` : `opensearch-${version}`

	switch (process.platform) {
		case 'win32':
			return `${name}-windows-arm64.zip`
		default:
			return `${name}-linux-x64.tar.gz`
	}
}

const getDownloadUrl = (version: Version, distribution: Distribution): string => {
	const archive = getArchiveName(version, distribution)

	if (distribution === 'min') {
		return `https://artifacts.opensearch.org/releases/core/opensearch/${version}/${archive}`
	}

	return `https://artifacts.opensearch.org/releases/bundle/opensearch/${version}/${archive}`
}

export const getDownloadPath = (): string => {
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

export const download = async ({ version, distribution }: Pick<VersionArgs, 'version' | 'distribution'>) => {
	// Both distributions extract to an opensearch-{version} directory, so
	// each gets its own cache subdirectory to avoid colliding.
	const path = join(getDownloadPath(), distribution)
	const name = `opensearch-${version}`
	const file = join(path, name)

	if (await exists(file)) {
		return file
	}

	console.log(`Downloading OpenSearch ${version} (${distribution})`)

	const url = getDownloadUrl(version, distribution)
	const response = await fetch(url, { method: 'GET' })
	const data = await response.arrayBuffer()
	const buffer = Buffer.from(data)

	// Parallel test workers can race on a cold cache, so extract into a
	// process-unique staging directory and atomically rename the result
	// into place. The loser of the race just discards its copy.
	const staging = join(path, `staging-${process.pid}`)

	await mkdir(staging, { recursive: true, mode: '0777' })
	await decompress(buffer, staging)

	try {
		await rename(join(staging, name), file)
	} catch {
		// Another worker already put the directory in place.
	}

	await rm(staging, { recursive: true, force: true })

	return file
}
