import { readFile } from 'fs/promises'
import { join } from 'path'
import { Dependency, Package } from '../types'

export const buildPackages = async (cwd: string, importers: Record<string, Record<string, Dependency>>) => {
	const packages: Record<string, Package> = {}

	await Promise.all(
		Object.entries(importers).map(async ([path, dependencies]) => {
			const packageJson = await readFile(join(cwd, path, 'package.json'), 'utf8')
			const packageData = JSON.parse(packageJson) as {
				name: string
				main?: string
				module?: string
			}

			const entry = packageData.module ?? packageData.main

			// Keyed by path - package names can repeat inside a workspace
			// (like a package & its next generation sharing a name), and
			// name keys would let one clobber the other.
			packages[join(cwd, path)] = {
				name: packageData.name,
				path: join(cwd, path),
				main: entry ? join(cwd, path, entry) : undefined,
				dependencies,
			}
		})
	)

	return packages
}
