import { readdir, readFile, mkdir, rm, stat, symlink } from 'fs/promises'
import { createRequire } from 'module'
import { dirname, join } from 'path'
import { Workspace } from '@awsless/ts-file-cache'
import { debug } from '../cli/debug.js'
import { directories } from '../util/path.js'

// The bundle keeps the aws sdk external like the lambda runtime does,
// so the sdk clients the project doesn't depend on get linked in here.
export const linkSdkPackages = async (workspace: Workspace, buildDir: string, onWarn?: (message: string) => void) => {
	const filesDir = join(buildDir, 'files')
	const packages = new Set<string>()

	for (const file of await readdir(filesDir)) {
		if (!file.endsWith('.mjs')) {
			continue
		}

		const code = await readFile(join(filesDir, file), 'utf8')

		// Besides the aws sdk, the lambda runtime also provides packages
		// through layers, like sharp for the image feature.
		for (const match of code.matchAll(/(?:from\s*|import\()\s*["'](@aws-sdk\/[a-z0-9-]+|sharp)["']/g)) {
			packages.add(match[1]!)
		}
	}

	const ownRequire = createRequire(import.meta.url)

	// A plain stat instead of require.resolve: the bin shim's NODE_PATH
	// would report transitive clients the worker's esm import can't load.
	const isProjectDep = async (name: string) => {
		try {
			await stat(join(directories.root, 'node_modules', name, 'package.json'))
			return true
		} catch {
			return false
		}
	}

	// The library pulling in a transitive client pins its version, so the
	// link follows that - a second copy of a client garbles requests.
	const resolveFromDependents = async (name: string) => {
		const roots = Object.values(workspace.packages).flatMap(pkg => [
			pkg.path,
			...Object.entries(pkg.dependencies).map(([dependency, info]) =>
				info.type === 'workspace'
					? workspace.packages[info.link]?.path
					: join(pkg.path, 'node_modules', dependency)
			),
		])

		// Sorted, so two libraries pinning different versions still pick
		// the same one on every run.
		for (const root of roots.filter(root => typeof root === 'string').toSorted()) {
			const path = join(root, 'node_modules', name)

			try {
				await stat(join(path, 'package.json'))
				return path
			} catch {}
		}

		return
	}

	for (const name of packages) {
		const target = join(buildDir, 'node_modules', name)

		try {
			if (await isProjectDep(name)) {
				// A leftover link from an earlier run would shadow the
				// project's own copy - a package manager prune can leave
				// it dangling.
				await rm(target, { recursive: true, force: true })
				debug(`Sdk link ${name}: project resolves`)
				continue
			}

			let source = await resolveFromDependents(name)

			if (!source) {
				try {
					source = dirname(ownRequire.resolve(`${name}/package.json`))
				} catch {
					onWarn?.(
						`The bundle imports "${name}", which is neither a project dependency nor shipped with the cli. Add it to your project dependencies.`
					)
					continue
				}
			}

			await mkdir(dirname(target), { recursive: true })
			await rm(target, { recursive: true, force: true })
			await symlink(source, target, 'dir')

			// A link into a pruned package manager store resolves to
			// nothing - fail loud instead of booting a worker that can't
			// import the sdk.
			await stat(join(target, 'package.json'))
			debug(`Sdk link ${name}: ${source}`)
		} catch (error) {
			onWarn?.(
				`Linking the "${name}" sdk package failed: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}
}
