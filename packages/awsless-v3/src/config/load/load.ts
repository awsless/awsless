import { glob } from 'glob'
import { basename, dirname, join } from 'path'
import { debug } from '../../cli/debug.js'
import { ProgramOptions } from '../../cli/program.js'
import { color } from '../../cli/ui/style.js'
import { directories, findRootDir, setRoot } from '../../util/path.js'
import { AppConfig, AppSchema } from '../app.js'
import { setLocalBasePath } from '../schema/relative-path.js'
import { StackConfig, StackSchema } from '../stack.js'
import { readConfigWithStage } from './read.js'
import { validateConfig } from './validate.js'

export const loadAppConfig = async (options: ProgramOptions): Promise<AppConfig> => {
	debug('Find the root directory')

	const cwd = options.configFile ? dirname(join(process.cwd(), options.configFile)) : process.cwd()

	const configFileOptions = options.configFile
		? [basename(options.configFile)]
		: ['app.json', 'app.jsonc', 'app.json5']

	const [appFileName, root] = await findRootDir(cwd, configFileOptions)

	setRoot(root)
	setLocalBasePath(root)

	debug('CWD:', color.info(root))
	debug('Load app config file')

	const appConfig = await readConfigWithStage(appFileName, options.stage)

	debug('Validate app config file')

	const app = await validateConfig(AppSchema, appFileName, appConfig)

	// debug('Load credentials', style.info(app.profile))
	// const credentials = getCredentials(app.profile)

	// debug('Load AWS account ID')
	// const account = await getAccountId(credentials, app.region)
	// debug('Account ID:', style.info(account))

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

	for (const file of stackFiles.sort()) {
		const shouldIngore = file.split('/').filter(v => v.startsWith('_')).length > 0
		if (shouldIngore) {
			debug('Skip stack file:', color.info(file))
			continue
		}

		debug('Load stack file:', color.info(file))
		const stackConfig = await readConfigWithStage(join(directories.root, file), options.stage)

		setLocalBasePath(join(directories.root, dirname(file)))

		const stack = await validateConfig(StackSchema, file, stackConfig)

		stacks.push({
			...stack,
			file,
		})
	}

	return stacks
}
