import { realpathSync } from 'fs'
import { createRequire } from 'module'
import { dirname, join } from 'path'
import { pathToFileURL } from 'url'

type Binaries = {
	postgres: string
	initdb: string
}

// The embedded-postgres package name of this machine's build, like
// "@embedded-postgres/darwin-arm64".
const getPlatformPackage = () => {
	return `@embedded-postgres/${process.platform === 'win32' ? 'windows' : process.platform}-${process.arch}`
}

let binaries: Promise<Binaries> | undefined

const locate = async (): Promise<Binaries> => {
	const name = getPlatformPackage()
	let entry: string

	try {
		// The builds are dependencies of embedded-postgres, so they resolve
		// from its real location, wherever the package manager put it.
		const wrapper = realpathSync(createRequire(import.meta.url).resolve('embedded-postgres'))

		entry = realpathSync(createRequire(wrapper).resolve(name))
	} catch (error) {
		throw new Error(
			`The Postgres binaries aren't installed: "${name}" wasn't found. Install "embedded-postgres" on macOS or Linux.`,
			{ cause: error }
		)
	}

	const root = dirname(dirname(entry))

	// The Linux builds ship their library links as a list the package's
	// install script creates. Installs that skip scripts get them here.
	const { hydrateSymlinks } = (await import(
		/* @vite-ignore */ pathToFileURL(join(root, 'scripts', 'hydrate-symlinks.js')).href
	)) as { hydrateSymlinks: () => Promise<void> }

	await hydrateSymlinks()

	return (await import(/* @vite-ignore */ pathToFileURL(entry).href)) as Binaries
}

// The paths of the Postgres binaries that embedded-postgres installed for
// this machine. Only its files are used: its own server class installs
// exit handlers in whatever process imports it.
export const getBinaries = () => {
	binaries ??= locate().catch(error => {
		binaries = undefined
		throw error
	})

	return binaries
}
