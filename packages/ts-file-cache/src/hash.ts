import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import { builtinModules } from 'node:module'
import { relative, sep } from 'path'
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
			throw new Error(`Can't find imported file: "${file}" inside the source: "${sourceFile}"`, { cause: error })
		}

		// Posix separators keep the hash identical across platforms.
		const relFile = relative(workspace.cwd, file).split(sep).join('/')

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
	const dependency = findDependency(workspace, module, sourceFile)

	if (dependency) {
		if (dependency.type === 'package') {
			// Versioned keys let two workspace packages depend on
			// different versions of the same module without the first
			// one hashed shadowing the other.
			hashes.set(`${module}@${dependency.version}`, Buffer.from(dependency.treeHash, 'hex'))
		} else {
			// The lockfile link points at the exact package directory,
			// which stays unambiguous even with duplicate package names.
			const localPackage = workspace.packages[dependency.link]

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

	if (builtinModules.includes(module.replace(/^node:/, ''))) {
		return
	}

	throw new Error(`Can't find the dependency version for: ${file} inside the source: ${sourceFile}`)
}

export const mergeHashes = (hashes: Map<string, Buffer>) => {
	// Sorting by entry name keeps the result independent of the file
	// traversal order, and including the name in the digest makes two
	// files swapping their contents produce a different hash.
	const names = Array.from(hashes.keys()).toSorted()
	const merged = createHash('sha1')

	for (const name of names) {
		merged.update(name)
		merged.update(hashes.get(name)!)
	}

	return merged.digest('hex')
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
	const pkg = Object.values(workspace.packages)
		// The separator suffix stops prefix packages from matching their
		// sibling's sources, like "cli" matching "cli-next" files.
		.filter(p => source === p.path || source.startsWith(p.path + sep))
		.toSorted((a, b) => b.path.split(sep).length - a.path.split(sep).length)
		.find(p => p.dependencies[module])

	if (!pkg) {
		return
	}

	return pkg.dependencies[module]
}
