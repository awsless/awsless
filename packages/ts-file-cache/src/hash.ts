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
	sourceFile: string,
	allowedExtensions: string[],
	hashes: Map<string, Buffer>
) => {
	if (isLocalCodeFile(file)) {
		try {
			file = await resolveModuleImportFile(file, allowedExtensions)
		} catch (error) {
			throw new Error(`Can't find imported file: "${file}" inside the source: "${sourceFile}"`)
		}

		const relFile = relative(workspace.cwd, file)

		if (hashes.has(relFile)) {
			return
		}

		const code = await readFile(file, 'utf8')
		const ext = file.split('.').pop()
		const hash = createHash('sha1').update(code).digest()

		hashes.set(relFile, hash)

		if (!ext || !allowedExtensions.includes(ext)) {
			return
		}

		const deps = await findImports(file, code)

		for (const dep of deps) {
			await generateRecursiveFileHashes(workspace, dep, file, allowedExtensions, hashes)
		}

		return
	}

	const module = getPackageName(file)

	if (hashes.has(module)) {
		return
	}

	const dependency = findDependency(workspace, module, sourceFile)

	if (dependency) {
		if (dependency.type === 'package') {
			hashes.set(module, Buffer.from(`${module}:${dependency.version}`, 'utf8'))
		} else {
			const localPackage = workspace.packages[module]

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

	if (builtinModules.includes(module.replace(/^node\:/, ''))) {
		return
	}

	throw new Error(`Can't find the dependency version for: ${file} inside the source: ${sourceFile}`)
}

export const mergeHashes = (hashes: Map<string, Buffer>) => {
	const merge = Buffer.concat(Array.from(hashes.values()).sort())

	return createHash('sha1').update(merge).digest('hex')
}

const getPackageName = (importee: string) => {
	const parts = importee.split('/')

	if (importee.startsWith('@')) {
		if (parts.length >= 2) {
			return `${parts[0]}/${parts[1]}`
		}
	} else if (parts.length >= 1) {
		return parts[0]!
	}

	throw new Error(`Malformed importee: ${importee}`)
}

const findDependency = (workspace: Workspace, module: string, source: string) => {
	// const module = getPackageName(importee)
	const pkg = Object.values(workspace.packages)
		.filter(p => source.startsWith(p.path))
		.sort((a, b) => b.path.split('/').length - a.path.split('/').length)
		.find(p => p.dependencies[module])

	if (!pkg) {
		return
	}

	return pkg.dependencies[module]
}
