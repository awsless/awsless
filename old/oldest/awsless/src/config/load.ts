import { basename, dirname, extname, join } from 'path'
import { ProgramOptions } from '../cli/program.js'
import { getAccountId } from '../util/account.js'
import { getCredentials } from '../util/credentials.js'
import { debug } from '../cli/logger.js'
import { style } from '../cli/style.js'
import { AppSchema } from './app.js'
import { fileExist, findRootDir, setRoot } from '../util/path.js'
import { ZodSchema, z } from 'zod'
import { Config } from './config.js'
import { readFile } from 'fs/promises'
import { glob } from 'glob'
import { StackConfig, StackSchema } from './stack.js'
import { setLocalBasePath } from './schema/local-file.js'
import { ConfigError, FileError } from '../cli/error.js'
import JSON5 from 'json5'
import merge from 'deepmerge'

const readConfig = async (file: string) => {
	try {
		const json = await readFile(file, 'utf8')
		const data = JSON5.parse(json) as object

		return data
	} catch (error) {
		if (error instanceof Error) {
			throw new FileError(file, error.message)
		}

		throw error
	}
}

const readConfigWithStage = async (file: string, stage: string) => {
	const config = await readConfig(file)
	const ext = extname(file)
	const stageFileName = basename(file, ext) + '.' + stage + ext
	const stageFile = join(dirname(file), stageFileName)
	const stageFileExists = await fileExist(stageFile)

	if (!stageFileExists) {
		return config
	}

	debug('Load env file:', style.info(stageFile))
	const stageConfig = await readConfig(stageFile)

	return merge(config, stageConfig)
}

const parseConfig = async <S extends ZodSchema>(schema: S, file: string, data: unknown): Promise<z.output<S>> => {
	try {
		const result = await schema.parseAsync(data)
		return result
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new ConfigError(file, error, data)
		}

		throw error
	}
}

export const loadConfig = async (options: ProgramOptions): Promise<Config> => {
	debug('Find the root directory')

	const configFileOptions = options.configFile ? [options.configFile] : ['app.json', 'app.jsonc', 'app.json5']
	const [appFileName, root] = await findRootDir(process.cwd(), configFileOptions)

	setRoot(root)
	setLocalBasePath(root)

	debug('CWD:', style.info(root))
	debug('Load app config file')

	const appConfig = await readConfigWithStage(appFileName, options.stage)

	debug('Validate app config file')

	const app = await parseConfig(AppSchema, appFileName, appConfig)

	debug('Load credentials', style.info(app.profile))
	const credentials = getCredentials(app.profile)

	debug('Load AWS account ID')
	const account = await getAccountId(credentials, app.region)
	debug('Account ID:', style.info(account))

	debug('Load stacks config files')

	const ext = '{json,jsonc,json5}'
	const stackFiles = await glob([`**/stack.${ext}`, `**/*.stack.${ext}`], {
		ignore: ['**/node_modules/**', '**/dist/**'],
		cwd: root,
	})

	const stacks: StackConfig[] = []

	for (const file of stackFiles.sort()) {
		if (basename(file).startsWith('_')) {
			debug('Skip stack file:', style.info(file))
			continue
		}

		debug('Load stack file:', style.info(file))
		const stackConfig = await readConfigWithStage(file, options.stage)

		setLocalBasePath(join(process.cwd(), dirname(file)))

		const stack = await parseConfig(StackSchema, file, stackConfig)
		stacks.push({
			...stack,
			file,
		})
	}

	return {
		app,
		stacks,
		account,
		credentials,
		stage: options.stage,
	}
}
