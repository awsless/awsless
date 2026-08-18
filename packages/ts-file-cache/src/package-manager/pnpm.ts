import { join } from 'path'
import { parse } from 'yaml'
import { Dependency } from '../types'
import { buildPackages } from './importer'

type LockFileDependency = {
	specifier: string
	version: string
}

type LockFile = {
	importers: Record<
		string,
		{
			devDependencies?: Record<string, LockFileDependency>
			optionalDependencies?: Record<string, LockFileDependency>
			dependencies?: Record<string, LockFileDependency>
		}
	>
}

export const pnpm = async (cwd: string, lockFile: string) => {
	const data = parse(lockFile) as LockFile
	const importers: Record<string, Record<string, Dependency>> = {}

	for (const [path, importee] of Object.entries(data.importers)) {
		const deps = { ...importee.devDependencies, ...importee.optionalDependencies, ...importee.dependencies }
		const dependencies: Record<string, Dependency> = {}

		for (const [name, entry] of Object.entries(deps)) {
			if (entry.version.startsWith('link:')) {
				dependencies[name] = {
					type: 'workspace',
					link: join(cwd, path, entry.version.substring(5)),
				}
			} else {
				dependencies[name] = {
					type: 'package',
					version: entry.version,
				}
			}
		}

		importers[path] = dependencies
	}

	const packages = await buildPackages(cwd, importers)

	return {
		cwd,
		packages,
	}
}
