import { watch } from 'chokidar'
import { basename, sep } from 'path'
import { debug } from '../../cli/debug.js'
import { ProgramOptions } from '../../cli/program.js'
import { validateFeatures } from '../../feature/validate.js'
import { directories } from '../../util/path.js'
import { AppConfig } from '../app.js'
import { StackConfig } from '../stack.js'
import { loadAppConfig, loadStackConfigs } from './load.js'

const isConfigFile = (path: string) => {
	const base = basename(path)

	return /^app\.(json|jsonc|json5)$/.test(base) || /(^|\.)stack\.(json|jsonc|json5)$/.test(base)
}

export const watchConfig = async (
	options: ProgramOptions,
	resolve: (event: { appConfig: AppConfig; stackConfigs: StackConfig[] }) => void,
	reject: (error: unknown) => void
) => {
	await loadAppConfig(options)

	debug('Start watching...')

	// Chokidar 5 dropped glob support, so the whole project is watched
	// with a filter that prunes the ignored directories & only lets the
	// app & stack config files through.
	const ignoredDirectories = new Set(['node_modules', '.awsless', 'dist', '.git'])

	const watcher = watch(directories.root, {
		ignored: (path, stats) => {
			if (path.split(sep).some(segment => ignoredDirectories.has(segment))) {
				return true
			}

			if (stats?.isFile()) {
				return !isConfigFile(path)
			}

			return false
		},
		awaitWriteFinish: true,
	})

	watcher.on('change', async path => {
		if (!isConfigFile(path)) {
			return
		}

		try {
			const appConfig = await loadAppConfig(options)
			const stackConfigs = await loadStackConfigs(options)

			validateFeatures({ appConfig, stackConfigs })
			resolve({ appConfig, stackConfigs })
		} catch (error) {
			reject(error)
		}
	})

	return watcher
}
