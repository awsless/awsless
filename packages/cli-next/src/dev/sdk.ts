import { readdir, readFile, mkdir, rm, symlink } from 'fs/promises'
import { createRequire } from 'module'
import { dirname, join } from 'path'
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

	const projectRequire = createRequire(join(directories.root, 'noop.js'))
	const ownRequire = createRequire(import.meta.url)

	for (const name of packages) {
		try {
			projectRequire.resolve(`${name}/package.json`)
			continue
		} catch (_) {}

		let source: string

		try {
			source = dirname(ownRequire.resolve(`${name}/package.json`))
		} catch (_) {
			onWarn?.(
				`The bundle imports "${name}", which is neither a project dependency nor shipped with the cli. Add it to your project dependencies.`
			)
			continue
		}

		const target = join(buildDir, 'node_modules', name)

		await mkdir(dirname(target), { recursive: true })
		await rm(target, { recursive: true, force: true })
		await symlink(source, target, 'dir')
	}
}
