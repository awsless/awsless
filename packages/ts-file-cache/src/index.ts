import { readdir } from 'fs/promises'
import { extname, resolve } from 'path'
import { generateRecursiveFileHashes, mergeHashes } from './hash'
import { toAbsolute } from './module'
import { loadPackageManager } from './package-manager/util'
import { Workspace } from './types'

export * from './types'

export const loadWorkspace = async (search: string): Promise<Workspace> => {
	return loadPackageManager(toAbsolute(search))
}

type Options = {
	extensions?: string[]
}

const defaultOptions = {
	extensions: ['js', 'mjs', 'jsx', 'ts', 'mts', 'tsx'],
}

export const generateFileHash = async (workspace: Workspace, file: string, opts: Options = {}) => {
	const options = { ...defaultOptions, ...opts }
	const hashes = new Map<string, Buffer>()
	const absoluteFile = toAbsolute(file)

	await generateRecursiveFileHashes(workspace, absoluteFile, absoluteFile, options.extensions, hashes)

	return mergeHashes(hashes)
}

export const generateFolderHash = async (workspace: Workspace, folder: string, opts: Options = {}) => {
	const options = { ...defaultOptions, ...opts }
	const hashes = new Map<string, Buffer>()
	const absoluteFolder = toAbsolute(folder)
	const files = await readdir(absoluteFolder, { recursive: true, withFileTypes: true })

	for (const file of files) {
		if (file.isFile() && options.extensions.includes(extname(file.name).substring(1))) {
			const f = resolve(file.parentPath, file.name)
			await generateRecursiveFileHashes(workspace, f, f, options.extensions, hashes)
		}
	}

	return mergeHashes(hashes)
}
