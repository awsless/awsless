import { watch } from 'chokidar'
import { debug } from '../../cli/debug.js'
import { ProgramOptions } from '../../cli/program.js'
import { validateFeatures } from '../../feature/validate.js'
import { directories } from '../../util/path.js'
import { AppConfig } from '../app.js'
import { StackConfig } from '../stack.js'
import { loadAppConfig, loadStackConfigs } from './load.js'

export const watchConfig = async (
	options: ProgramOptions,
	resolve: (event: { appConfig: AppConfig; stackConfigs: StackConfig[] }) => void,
	reject: (error: unknown) => void
) => {
	await loadAppConfig(options)

	debug('Start watching...')

	const ext = '{json,jsonc,json5}'

	const watcher = watch([`app.${ext}`, `**/stack.${ext}`, `**/*.stack.${ext}`], {
		cwd: directories.root,
		ignored: ['**/node_modules/**', '**/dist/**'],
		awaitWriteFinish: true,
		// interval: 1000,
	})

	watcher.on('change', async () => {
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
