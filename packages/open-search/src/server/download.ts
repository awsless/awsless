import { stat, mkdir } from 'fs/promises';
import { resolve, join } from 'path'
import findCacheDir from 'find-cache-dir'
import decompress from 'decompress';

export type Version = `${string}.${string}.${string}`

const getArchiveName = (version: Version): string => {
	switch (process.platform) {
		case 'darwin':
			return `elasticsearch-${version}-darwin-x86_64.tar.gz`;
		case 'linux':
			return `elasticsearch-${version}-linux-x86_64.tar.gz`;
		case 'win32':
			return `elasticsearch-${version}-windows-x86_64.zip`;
		default:
			return `elasticsearch-${version}-linux-x86_64.tar.gz`;
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
	const name = `elasticsearch-${version}`
	const file = join(path, name)

	if(await exists(file)) {
		return file
	}

	console.log(`Downloading ElasticSearch ${version}`);

	const url = `https://artifacts.elastic.co/downloads/elasticsearch/${getArchiveName(version)}`;
	const response = await fetch(url, { method: 'GET' })
	const data = await response.arrayBuffer()
	const buffer = Buffer.from(data)

	await mkdir(path, { recursive: true, mode: '0777' })
	await decompress(buffer, path)

	return file
}
