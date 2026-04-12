import { lstat, readdir } from 'node:fs/promises'
import { join } from 'node:path'

export const generateCacheKey = async (directories: string[]) => {
	const files = await listAllFiles(directories)
	const sortedFiles = files.toSorted()
	const hashes: Record<string, string> = {}

	for (const file of sortedFiles) {
		hashes[file] = await createHashFromFile(file)
	}

	return Bun.MD5.hash(JSON.stringify(hashes), 'hex')
}

const createHashFromFile = async (filePath: string) => {
	const hasher = new Bun.MD5()
	const stream = Bun.file(filePath).stream()

	for await (const chunk of stream) {
		hasher.update(chunk)
	}

	return hasher.digest('hex')
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

			files.push(...dirents.filter(d => d.isFile()).map(file => join(file.parentPath, file.name)))
		} else if (stat.isFile()) {
			files.push(entry)
		}
	}

	return files
}
