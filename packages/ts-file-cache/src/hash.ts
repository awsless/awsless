import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import { builtinModules } from 'node:module'
import { relative } from 'path'
import { findImports } from './import'
import { isLocalCodeFile, resolveModuleImportFile } from './module'
import { Workspace } from './types'

export const generateRecursiveFileHashes = async (
	workspace: Workspace,
	file: string,
	source: string,
	allowedExtensions: string[],
	hashes: Map<string, Buffer>
) => {
	if (isLocalCodeFile(file)) {
		file = await resolveModuleImportFile(file, allowedExtensions)
		const relFile = relative(workspace.cwd, file)

		if (hashes.has(relFile)) {
			return
		}

		const code = await readFile(file, 'utf8')
		const deps = await findImports(file, code)
		const hash = createHash('sha1').update(code).digest()

		hashes.set(relFile, hash)

		for (const dep of deps) {
			await generateRecursiveFileHashes(workspace, dep, file, allowedExtensions, hashes)
		}

		return
	}

	if (hashes.has(file)) {
		return
	}

	const dependency = findDependency(workspace, file, source)

	if (dependency) {
		if (dependency.type === 'package') {
			hashes.set(file, Buffer.from(`${file}:${dependency.version}`, 'utf8'))
		} else {
			const localPackage = workspace.packages[file]

			if (!localPackage) {
				throw new Error(`Can't find the local workspace package for: ${file}`)
			}

			if (!localPackage.main) {
				throw new Error(`Workspace package doesn't have a main entry: ${file}`)
			}

			await generateRecursiveFileHashes(
				workspace,
				localPackage.main,
				localPackage.main,
				allowedExtensions,
				hashes
			)
		}

		return
	}

	if (builtinModules.includes(file.replace(/^node\:/, ''))) {
		return
	}

	throw new Error(`Can't find the dependency version for: ${file} inside the source: ${source}`)
}

export const mergeHashes = (hashes: Map<string, Buffer>) => {
	const merge = Buffer.concat(Array.from(hashes.values()).sort())

	return createHash('sha1').update(merge).digest('hex')
}

const findDependency = (workspace: Workspace, module: string, source: string) => {
	const pkg = Object.values(workspace.packages)
		.filter(p => source.startsWith(p.path))
		.sort((a, b) => b.path.split('/').length - a.path.split('/').length)
		.find(p => p.dependencies[module])

	if (!pkg) {
		return
	}

	return pkg.dependencies[module]
}
