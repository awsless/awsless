import { basename, dirname, join, resolve } from 'path'
import { glob } from 'glob'
import { debug, openDebugLog } from '../../cli/debug.js'
import { ProgramOptions } from '../../cli/program.js'
import { color } from '../../cli/ui/style.js'
import { registerConfigFile } from '../../dev/util.js'
import { directories, findRootDir, setRoot } from '../../util/path.js'
import { AppConfig, AppSchema } from '../app.js'
import { setLocalBasePath } from '../schema/relative-path.js'
import { StackConfig, StackSchema } from '../stack.js'
import { readConfigWithStage } from './read.js'
import { validateConfig } from './validate.js'

// Locates the project by its app config file & points every project
// relative path at it. Returns the app config file that was found.
export const resolveProjectRoot = async (options: ProgramOptions) => {
	debug('Find the root directory')

	const cwd = options.configFile ? dirname(resolve(options.configFile)) : process.cwd()

	const configFileOptions = options.configFile
		? [basename(options.configFile)]
		: ['app.json', 'app.jsonc', 'app.json5']

	if (options.configFile) {
		registerConfigFile(options.configFile)
	}

	const [appFileName, root] = await findRootDir(cwd, configFileOptions)

	setRoot(root)
	setLocalBasePath(root)
	openDebugLog()

	debug('CWD:', color.info(root))

	return appFileName
}

export const loadAppConfig = async (options: ProgramOptions): Promise<AppConfig> => {
	const appFileName = await resolveProjectRoot(options)

	debug('Load app config file')

	const appConfig = await readConfigWithStage(appFileName, options.stage)

	debug('Validate app config file')

	const app: AppConfig = await validateConfig(AppSchema, appConfig.file, appConfig.data)

	app.stage = options.stage

	return app
}

export const loadStackConfigs = async (options: ProgramOptions) => {
	debug('Load stacks config files')

	const ext = '{json,jsonc,json5}'

	const stackFiles = await glob([`**/stack.${ext}`, `**/*.stack.${ext}`], {
		ignore: ['**/node_modules/**', '**/dist/**'],
		cwd: directories.root,
	})

	const stacks: StackConfig[] = []

	for (const file of stackFiles.toSorted()) {
		const shouldIgnore = file.split('/').filter(v => v.startsWith('_')).length > 0
		if (shouldIgnore) {
			debug('Skip stack file:', color.info(file))
			continue
		}

		debug('Load stack file:', color.info(file))
		const stackConfig = await readConfigWithStage(join(directories.root, file), options.stage)

		setLocalBasePath(join(directories.root, dirname(file)))

		const stack = await validateConfig(StackSchema, stackConfig.file, stackConfig.data)

		stacks.push({
			...stack,
			file,
		})
	}

	return stacks
}
