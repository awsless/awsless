import { createHash } from 'crypto'
import { join } from 'path'
import { parse } from 'yaml'
import { Dependency } from '../types'
import { buildPackages } from './util'

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
	snapshots?: Record<
		string,
		{
			dependencies?: Record<string, string>
			optionalDependencies?: Record<string, string>
		}
	>
}

export const pnpm = async (cwd: string, lockFile: string, lockfileHash: string) => {
	const data = parse(lockFile) as LockFile
	const treeHash = createTreeHasher(data, lockfileHash)
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
					treeHash: treeHash(`${name}@${entry.version}`),
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

// The snapshot section resolves the full dependency graph, so hashing
// the keys reachable from a dependency pins its whole subtree down to
// every transitive version. Lockfiles from before v9 lack the section
// & fall back to the whole lockfile hash.
const createTreeHasher = (data: LockFile, lockfileHash: string) => {
	if (!data.snapshots) {
		return () => lockfileHash
	}

	const graph: Record<string, string[]> = {}

	for (const [key, entry] of Object.entries(data.snapshots)) {
		const deps = { ...entry.dependencies, ...entry.optionalDependencies }
		const children: string[] = []

		for (const [name, version] of Object.entries(deps)) {
			if (!version.startsWith('link:')) {
				children.push(`${name}@${version}`)
			}
		}

		graph[key] = children
	}

	const hashed = new Map<string, string>()

	return (key: string) => {
		const cached = hashed.get(key)

		if (cached) {
			return cached
		}

		// A key missing from the graph still contributes itself, which
		// pins its name & exact version.
		const reachable = new Set<string>([key])
		const queue = [key]

		while (queue.length > 0) {
			const current = queue.pop()!

			for (const child of graph[current] ?? []) {
				if (!reachable.has(child)) {
					reachable.add(child)
					queue.push(child)
				}
			}
		}

		const hash = createHash('sha1')

		for (const entry of Array.from(reachable).toSorted()) {
			hash.update(entry)
			hash.update('\n')
		}

		const digest = hash.digest('hex')

		hashed.set(key, digest)

		return digest
	}
}
