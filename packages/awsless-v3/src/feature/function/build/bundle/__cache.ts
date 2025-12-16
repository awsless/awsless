import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, readdir } from 'node:fs/promises'
import { join } from 'node:path'

// type CacheKeyProps = {
// 	directory: string
// }

export const bundleCacheKey = async (directories: string[]) => {
	const files = await listAllFiles(directories)
	const hashes: Record<string, string> = {}

	for (const file of files) {
		hashes[file] = await createHashFromFile(file)
	}

	return createHash('md5').update(JSON.stringify(hashes)).digest('hex')
}

const createHashFromFile = (file: string) => {
	return new Promise<string>(resolve => {
		const hash = createHash('md5')
		const stream = createReadStream(file)

		stream.on('data', data => hash.update(data))
		stream.on('end', () => resolve(hash.digest('hex')))
	})
}

const listAllFiles = async (list: string[]) => {
	const files: string[] = []

	for (const entry of list) {
		const stat = await lstat(entry)
		if (stat.isDirectory()) {
			const dirents = await readdir(entry, {
				recursive: true,
				withFileTypes: true,
			})

			files.push(...dirents.filter(d => d.isFile()).map(file => join(file.path, file.name)))
		} else if (stat.isFile()) {
			files.push(entry)
		}
	}

	return files
}
