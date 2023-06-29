import { stat, mkdir } from 'fs/promises'
import { resolve, join } from 'path'
import findCacheDir from 'find-cache-dir'
import decompress from 'decompress'

export type Version = `${string}.${string}.${string}`

const getFileName = (version: Version): string => {
	switch (process.platform) {
		case 'win32':
			return `mysql-${version}-winx64.zip`
		case 'darwin':
			return `mysql-${version}-macos13-arm64.tar.gz`
		default:
			return `mysql-${version}-linux-glibc2.12-x86_64.tar.xz`
		// return `mysql-${version}-linux-glibc2.17-aarch64.tar.gz`
	}
}

const getDownloadPath = (): string => {
	return resolve(
		findCacheDir({
			name: '@awsless/mysql',
			cwd: process.cwd(),
		}) || ''
	)
}

const exists = async (path: string) => {
	try {
		await stat(path)
	} catch (error) {
		console.log(error)

		return false
	}

	return true
}

export const download = async (version: Version) => {
	const path = getDownloadPath()
	const name = `mysql-${version}`
	const file = join(path, name)

	if (await exists(file)) {
		return file
	}

	console.log(`Downloading MySQL ${version}`)

	const url = `https://downloads.mysql.com/archives/get/p/23/file/${getFileName(version)}`

	const response = await fetch(url, { method: 'GET' })
	const data = await response.arrayBuffer()
	const buffer = Buffer.from(data)

	await mkdir(path, { recursive: true, mode: '0777' })
	await decompress(buffer, path, {
		map: file => {
			file.path = `${name}/${file.path}`
			return file
		},
		strip: 1,
	})

	return file
}
