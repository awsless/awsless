import { stat, mkdir } from 'fs/promises';
import { resolve, join } from 'path'
import findCacheDir from 'find-cache-dir'
import decompress from 'decompress';
import { exec } from 'child_process';
import { promisify } from 'util';

export type Version = `${string}.${string}.${string}`

const getArchiveName = (version: Version): string => {
	switch (process.platform) {
		case 'win32':
			return `opensearch-${version}-windows-arm64.zip`;
		default:
			return `opensearch-${version}-linux-x64.tar.gz`;
	}
}

const getDownloadPath = (): string => {
	return resolve(findCacheDir({
		name: '@awsless/open-search',
		cwd: process.cwd(),
	}) || '')
}

const exists = async (path:string) => {
	try {
		await stat(path)
	} catch(error) {
		return false
	}

	return true
}

export const download = async (version: Version) => {
	const path = getDownloadPath()
	const name = `opensearch-${version}`
	const file = join(path, name)

	if(await exists(file)) {
		return file
	}

	console.log(`Downloading OpenSearch ${version}`);

	const url = `https://artifacts.opensearch.org/releases/bundle/opensearch/${version}/${getArchiveName(version)}`;

	const response = await fetch(url, { method: 'GET' })
	const data = await response.arrayBuffer()
	const buffer = Buffer.from(data)

	await mkdir(path, { recursive: true, mode: '0777' })
	await decompress(buffer, path)

	// const result = await promisify(exec)(join(file, '/opensearch-tar-install.sh'))
	// console.log(result);

	return file
}
