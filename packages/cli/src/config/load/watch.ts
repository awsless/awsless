import { watch } from 'fs'
import { basename, sep } from 'path'
import { debug } from '../../cli/debug.js'
import { ProgramOptions } from '../../cli/program.js'
import { validateFeatures } from '../../feature/validate.js'
import { directories } from '../../util/path.js'
import { AppConfig } from '../app.js'
import { StackConfig } from '../stack.js'
import { loadAppConfig, loadStackConfigs, resolveProjectRoot } from './load.js'

const ignoredDirectories = new Set(['node_modules', '.awsless', 'dist', '.git'])

const isConfigFile = (path: string) => {
	const base = basename(path)

	return /^app\.(json|jsonc|json5)$/.test(base) || /(^|\.)stack\.(json|jsonc|json5)$/.test(base)
}

export const watchConfig = async (
	options: ProgramOptions,
	resolve: (event: { appConfig: AppConfig; stackConfigs: StackConfig[] }) => void,
	reject: (error: unknown) => void
) => {
	// The watcher needs the project root before any config is loaded.
	await resolveProjectRoot(options)

	debug('Start watching...')

	// One native recursive watcher instead of chokidar: chokidar arms a
	// watcher per directory, which takes minutes on big projects &
	// starves the dev servers before it ever gets ready.
	let reloadTimer: ReturnType<typeof setTimeout> | undefined

	const watcher = watch(directories.root, { recursive: true }, (_event, filename) => {
		if (!filename) {
			return
		}

		if (filename.split(sep).some(segment => ignoredDirectories.has(segment))) {
			return
		}

		if (!isConfigFile(filename)) {
			return
		}

		// Debounced, so a burst of saves triggers one reload.
		clearTimeout(reloadTimer)
		reloadTimer = setTimeout(async () => {
			try {
				const appConfig = await loadAppConfig(options)
				const stackConfigs = await loadStackConfigs(options)

				validateFeatures({ appConfig, stackConfigs })
				resolve({ appConfig, stackConfigs })
			} catch (error) {
				reject(error)
			}
		}, 150)
	})

	return watcher
}
