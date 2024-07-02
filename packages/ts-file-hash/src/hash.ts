import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import { builtinModules } from 'node:module'
import { findFileImports } from './import'
import { isLocalCodeFile, resolveModuleImportFile } from './module'

export const generateRecursiveFileHashes = async (
	file: string,
	allowedExtensions: string[],
	dependencyVersions: Record<string, string>,
	hashes: Map<string, Buffer>
) => {
	if (isLocalCodeFile(file)) {
		file = await resolveModuleImportFile(file, allowedExtensions)
	}

	if (hashes.has(file)) {
		return
	}

	if (isLocalCodeFile(file)) {
		const code = await readFile(file, 'utf8')
		const deps = await findFileImports(file, code)
		const hash = createHash('sha1').update(code).digest()

		hashes.set(file, hash)

		for (const dep of deps) {
			await generateRecursiveFileHashes(dep, allowedExtensions, dependencyVersions, hashes)
		}

		return
	}

	if (file in dependencyVersions && dependencyVersions[file]) {
		const version = dependencyVersions[file]!
		hashes.set(file, Buffer.from(`${file}:${version}`, 'utf8'))

		return
	}

	if (builtinModules.includes(file.replace(/^node\:/, ''))) {
		return
	}

	throw new Error(`Can't find the dependency version for: ${file}`)
}

export const mergeHashes = (hashes: Map<string, Buffer>) => {
	const merge = Buffer.concat(Array.from(hashes.values()).sort())
	return createHash('sha1').update(merge).digest('hex')
}
