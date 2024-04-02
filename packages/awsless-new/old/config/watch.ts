import { watch } from 'chokidar'
import { ProgramOptions } from '../cli/program.js'
import { Config } from './config.js'
import { findRootDir, setRoot } from '../util/path.js'
import { style } from '../cli/style.js'
import { debug } from '../cli/logger.js'
import { loadConfig } from './load.js'

export const watchConfig = async (
	options: ProgramOptions,
	resolve: (config: Config) => void,
	reject: (error: unknown) => void
) => {
	const configFileOptions = options.configFile ? [options.configFile] : ['app.json', 'app.jsonc', 'app.json5']
	const [_, root] = await findRootDir(process.cwd(), configFileOptions)

	setRoot(root)

	debug('CWD:', style.info(root))
	debug('Start watching...')

	const ext = '{json,jsonc,json5}'

	const watcher = watch([`app.${ext}`, `**/stack.${ext}`, `**/*.stack.${ext}`], {
		cwd: root,
		ignored: ['**/node_modules/**', '**/dist/**'],
		awaitWriteFinish: true,
	})

	watcher.on('change', async () => {
		try {
			const config = await loadConfig(options)
			resolve(config)
		} catch (error) {
			reject(error)
		}
	})

	return watcher
}
