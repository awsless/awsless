import { readdir } from 'fs/promises'
import { generateRecursiveFileHashes, mergeHashes } from './hash'
import { extname, resolve } from 'path'
import { pnpm } from './package-manager/pnpm'
import { Workspace } from './types'
import { toAbsolute } from './module'

export * from './types'

export const loadWorkspace = async (search: string): Promise<Workspace> => {
	const { cwd, packages } = await pnpm(toAbsolute(search))

	return {
		cwd,
		packages,
	}
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

	// console.log(hashes)

	return mergeHashes(hashes)
}

export const generateFolderHash = async (workspace: Workspace, folder: string, opts: Options = {}) => {
	const options = { ...defaultOptions, ...opts }
	const hashes = new Map<string, Buffer>()
	const files = await readdir(folder, { recursive: true, withFileTypes: true })

	for (const file of files) {
		if (file.isFile() && options.extensions.includes(extname(file.name).substring(1))) {
			const f = resolve(file.path, file.name)
			await generateRecursiveFileHashes(workspace, f, f, options.extensions, hashes)
		}
	}

	// console.log(hashes)

	return mergeHashes(hashes)
}
