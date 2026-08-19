import { readdir, readFile, mkdir, rm, stat, symlink } from 'fs/promises'
import { createRequire } from 'module'
import { dirname, join } from 'path'
import { debug } from '../cli/debug.js'
import { directories } from '../util/path.js'

// The aws sdk stays external in the bundle, because the lambda runtime
// provides it in production. Locally the worker resolves it from the
// project's node_modules, but a strict package manager only exposes
// the sdk clients the project directly depends on. The dev server
// plays the role of the lambda runtime by symlinking its own sdk
// copies into the build folder for every missing client.
export const linkSdkPackages = async (buildDir: string, onWarn?: (message: string) => void) => {
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

	// The check must mirror the worker's esm resolution: a plain walk up
	// from the build folder to the project's node_modules. It can't use
	// require.resolve, because the package manager's bin shim exports
	// NODE_PATH pointing into the hoisted pnpm store - resolve would
	// report every transitive sdk client as a project dependency, while
	// the worker, which never sees NODE_PATH & imports esm, can't load
	// them.
	const isProjectDep = async (name: string) => {
		try {
			await stat(join(directories.root, 'node_modules', name, 'package.json'))
			return true
		} catch (_) {
			return false
		}
	}

	// A transitive dependency (like the sdk client of a library the
	// project uses) lives in the pnpm store without being resolvable
	// from the project root. Those instances match the app's lockfile,
	// so they always win over the cli's own copies.
	const resolveFromStore = async (name: string) => {
		const store = join(directories.root, 'node_modules', '.pnpm')
		const prefix = name.replaceAll('/', '+') + '@'

		try {
			const entries = (await readdir(store)).filter(entry => entry.startsWith(prefix))

			// The highest version sorts last.
			const best = entries
				.sort((a, b) =>
					a.slice(prefix.length).localeCompare(b.slice(prefix.length), undefined, { numeric: true })
				)
				.at(-1)

			return best ? join(store, best, 'node_modules', name) : undefined
		} catch (_) {
			return undefined
		}
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

			let source = await resolveFromStore(name)

			if (!source) {
				try {
					source = dirname(ownRequire.resolve(`${name}/package.json`))
				} catch (_) {
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
