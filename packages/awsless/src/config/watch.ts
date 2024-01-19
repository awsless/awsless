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
	const configFile = options.configFile || 'app.json'
	const root = await findRootDir(process.cwd(), configFile)

	setRoot(root)

	debug('CWD:', style.info(root))
	debug('Start watching...')

	const watcher = watch(['app.json', '**/stack.json', '**/*.stack.json'], {
		cwd: root,
		ignored: ['**/node_modules/**', '**/dist/**'],
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
