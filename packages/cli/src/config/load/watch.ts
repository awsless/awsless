import { debug } from '../../cli/debug.js'
import { ProgramOptions } from '../../cli/program.js'
import { IGNORED_DIRECTORIES, isConfigFile, isIgnoredPath } from '../../dev/util.js'
import { watchTree } from '../../dev/watch-tree.js'
import { validateFeatures } from '../../feature/validate.js'
import { directories } from '../../util/path.js'
import { AppConfig } from '../app.js'
import { StackConfig } from '../stack.js'
import { loadAppConfig, loadStackConfigs, resolveProjectRoot } from './load.js'

export const watchConfig = async (
	options: ProgramOptions,
	resolve: (event: { appConfig: AppConfig; stackConfigs: StackConfig[] }) => void,
	reject: (error: unknown) => void
) => {
	// The watcher needs the project root before any config is loaded.
	await resolveProjectRoot(options)

	debug('Start watching...')

	let reloadTimer: ReturnType<typeof setTimeout> | undefined

	const watcher = await watchTree(directories.root, IGNORED_DIRECTORIES, filename => {
		if (isIgnoredPath(filename) || !isConfigFile(filename)) {
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
