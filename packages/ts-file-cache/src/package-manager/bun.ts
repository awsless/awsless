import { join } from 'path'
import { Dependency } from '../types'
import { buildPackages } from './importer'

type LockFileWorkspace = {
	name?: string
	dependencies?: Record<string, string>
	devDependencies?: Record<string, string>
	optionalDependencies?: Record<string, string>
}

type LockFile = {
	lockfileVersion: number
	workspaces: Record<string, LockFileWorkspace>
	packages?: Record<string, [string, ...unknown[]]>
}

export const bun = async (cwd: string, lockFile: string) => {
	const data = parseJsonc(lockFile) as LockFile

	// The resolution entry is formatted as "name@version".
	const resolvedVersions: Record<string, string> = {}

	for (const [key, entry] of Object.entries(data.packages ?? {})) {
		const resolution = entry[0]
		const at = resolution.lastIndexOf('@')
		const version = resolution.substring(at + 1)

		if (!version.startsWith('workspace:')) {
			resolvedVersions[key] = version
		}
	}

	const workspacePaths: Record<string, string> = {}

	for (const [path, workspace] of Object.entries(data.workspaces)) {
		if (workspace.name) {
			workspacePaths[workspace.name] = path
		}
	}

	const importers: Record<string, Record<string, Dependency>> = {}

	for (const [path, workspace] of Object.entries(data.workspaces)) {
		const deps = { ...workspace.devDependencies, ...workspace.optionalDependencies, ...workspace.dependencies }
		const dependencies: Record<string, Dependency> = {}

		for (const [name, specifier] of Object.entries(deps)) {
			if (specifier.startsWith('workspace:')) {
				const target = specifier.substring(10)
				const workspacePath = workspacePaths[name]

				if (workspacePath !== undefined) {
					dependencies[name] = {
						type: 'workspace',
						link: join(cwd, workspacePath),
					}
				} else {
					dependencies[name] = {
						type: 'workspace',
						link: join(cwd, path, target),
					}
				}

				continue
			}

			// Conflicting versions are stored under a nested
			// "importer-name/dependency-name" style key.
			const version = resolvedVersions[name] ?? resolvedVersions[`${workspace.name}/${name}`]

			if (version) {
				dependencies[name] = {
					type: 'package',
					version,
				}
			} else {
				dependencies[name] = {
					type: 'package',
					version: specifier,
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

// The bun lock file is JSONC, which allows comments and trailing commas.
const parseJsonc = (text: string) => {
	try {
		return JSON.parse(text) as unknown
	} catch (_) {
		return JSON.parse(stripJsoncSyntax(text)) as unknown
	}
}

const stripJsoncSyntax = (text: string) => {
	let result = ''
	let index = 0

	while (index < text.length) {
		const char = text[index]!

		if (char === '"') {
			result += char
			index++

			while (index < text.length) {
				const stringChar = text[index]!
				result += stringChar
				index++

				if (stringChar === '\\') {
					result += text[index] ?? ''
					index++
					continue
				}

				if (stringChar === '"') {
					break
				}
			}

			continue
		}

		if (char === '/' && text[index + 1] === '/') {
			while (index < text.length && text[index] !== '\n') {
				index++
			}

			continue
		}

		if (char === '/' && text[index + 1] === '*') {
			index += 2

			while (index < text.length && !(text[index] === '*' && text[index + 1] === '/')) {
				index++
			}

			index += 2
			continue
		}

		if (char === ',') {
			let ahead = index + 1

			while (ahead < text.length && /\s/.test(text[ahead]!)) {
				ahead++
			}

			if (text[ahead] === '}' || text[ahead] === ']') {
				index++
				continue
			}
		}

		result += char
		index++
	}

	return result
}
