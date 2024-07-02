import { readdir } from 'fs/promises'
import { generateRecursiveFileHashes, mergeHashes } from './hash'
import { PackageManager, loadPackageDependencyVersions } from './version'
import { dirname, extname, resolve } from 'path'

type Options = {
	extensions?: string[]
	packageManager?: PackageManager
	packageVersions?: Record<string, string>
}

const defaultOptions = {
	extensions: ['js', 'mjs', 'jsx', 'ts', 'mts', 'tsx'],
	packageManager: 'pnpm' as const,
}

export { loadPackageDependencyVersions }

export const generateFileHash = async (file: string, opts: Options = {}) => {
	const options = { ...defaultOptions, ...opts }
	const hashes = new Map<string, Buffer>()
	const versions =
		opts.packageVersions ?? (await loadPackageDependencyVersions(dirname(file), options.packageManager))

	await generateRecursiveFileHashes(file, options.extensions, versions, hashes)

	return mergeHashes(hashes)
}

export const generateFolderHash = async (folder: string, opts: Options = {}) => {
	const options = { ...defaultOptions, ...opts }
	const hashes = new Map<string, Buffer>()
	const versions = options.packageVersions ?? (await loadPackageDependencyVersions(folder, options.packageManager))
	const files = await readdir(folder, { recursive: true, withFileTypes: true })

	for (const file of files) {
		if (file.isFile() && options.extensions.includes(extname(file.name).substring(1))) {
			await generateRecursiveFileHashes(resolve(file.path, file.name), options.extensions, versions, hashes)
		}
	}

	return mergeHashes(hashes)
}
