import { createHash } from 'crypto'
import { lstat, readFile } from 'fs/promises'
import { join, normalize } from 'path'
import { Dependency, Package, Workspace } from '../types'
import { bun } from './bun'
import { pnpm } from './pnpm'

const parsers = {
	'pnpm-lock.yaml': pnpm,
	'bun.lock': bun,
} as const

export const loadPackageManager = async (search: string, level = 5): Promise<Workspace> => {
	if (!level) {
		throw new TypeError('No pnpm or bun lock file found')
	}

	for (const [lockFileName, parser] of Object.entries(parsers)) {
		const file = join(search, lockFileName)

		if (await fileExist(file)) {
			const content = await readFile(file, 'utf8')
			const lockfileHash = createHash('sha1').update(content).digest('hex')

			return {
				...(await parser(search, content, lockfileHash)),
				lockfileHash,
			}
		}
	}

	return loadPackageManager(normalize(join(search, '..')), level - 1)
}

const fileExist = async (file: string) => {
	try {
		const stat = await lstat(file)
		if (stat.isFile()) {
			return true
		}
	} catch {}

	return false
}

export const buildPackages = async (cwd: string, importers: Record<string, Record<string, Dependency>>) => {
	const packages: Record<string, Package> = {}

	await Promise.all(
		Object.entries(importers).map(async ([path, dependencies]) => {
			const packageJson = await readFile(join(cwd, path, 'package.json'), 'utf8')
			const packageData = JSON.parse(packageJson) as {
				name: string
				main?: string
				module?: string
				exports?: unknown
			}

			const entry = packageData.module ?? packageData.main
			const exports = Object.fromEntries(
				Object.entries(exportFiles(packageData.exports)).map(([subpath, file]) => [subpath, join(cwd, path, file)])
			)

			// Keyed by path - package names can repeat inside a workspace
			// (like a package & its next generation sharing a name), and
			// name keys would let one clobber the other.
			packages[join(cwd, path)] = {
				name: packageData.name,
				path: join(cwd, path),
				main: entry ? join(cwd, path, entry) : undefined,
				exports,
				dependencies,
			}
		})
	)

	return packages
}

// A package.json's exports as one file per subpath: a string, conditions
// (the first of bun's, import or default that leads to a file) or a map of
// subpaths. Patterns with a "*" are left out.
const exportFiles = (exports: unknown): Record<string, string> => {
	const target = (value: unknown): string | undefined => {
		if (typeof value === 'string') {
			return value
		}

		if (value && typeof value === 'object' && !Array.isArray(value)) {
			const conditions = value as Record<string, unknown>

			for (const condition of ['bun', 'import', 'module', 'default', 'require']) {
				const file = target(conditions[condition])

				if (file) {
					return file
				}
			}
		}

		return
	}

	if (exports && typeof exports === 'object' && !Array.isArray(exports)) {
		const entries = Object.entries(exports as Record<string, unknown>)

		if (entries.every(([key]) => key.startsWith('.'))) {
			return Object.fromEntries(
				entries.flatMap(([subpath, value]) => {
					const file = subpath.includes('*') ? undefined : target(value)

					return file ? [[subpath, file]] : []
				})
			)
		}
	}

	const file = target(exports)

	return file ? { '.': file } : {}
}
