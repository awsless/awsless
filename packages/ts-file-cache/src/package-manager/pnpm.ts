import { lstat, readFile } from 'fs/promises'
import { join, normalize } from 'path'
import { parse } from 'yaml'
import { Dependency, Package } from '../types'

type LockFileDependency = {
	specifier: string
	version: string
}

export const pnpm = async (search: string) => {
	const [cwd, lockFile] = await findLockFile(search)
	const data = parse(lockFile) as {
		importers: Record<
			string,
			{
				devDependencies?: Record<string, LockFileDependency>
				dependencies?: Record<string, LockFileDependency>
			}
		>
	}

	const packages: Record<string, Package> = {}

	await Promise.all(
		Object.entries(data.importers).map(async ([path, importee]) => {
			const deps = { ...importee.devDependencies, ...importee.dependencies }
			const dependencies: Record<string, Dependency> = {}
			const packageJson = await readFile(join(cwd, path, 'package.json'), 'utf8')
			const packageData = JSON.parse(packageJson) as {
				name: string
				main?: string
				module?: string
			}

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

			const entry = packageData.module ?? packageData.main

			packages[packageData.name] = {
				name: packageData.name,
				path: join(cwd, path),
				main: entry ? join(cwd, path, entry) : undefined,
				dependencies,
			}
		})
	)

	return {
		cwd,
		packages,
	}
}

const findLockFile = async (path: string, level = 5): Promise<[string, string]> => {
	if (!level) {
		throw new TypeError('No pnpm lock file found')
	}

	const file = join(path, 'pnpm-lock.yaml')
	const exists = await fileExist(file)

	if (exists) {
		return [path, await readFile(file, 'utf8')]
	}

	return findLockFile(normalize(join(path, '..')), level - 1)
}

const fileExist = async (file: string) => {
	try {
		const stat = await lstat(file)
		if (stat.isFile()) {
			return true
		}
	} catch (error) {}

	return false
}
