import { dirname, join } from 'path'
import { ProgramOptions } from '../cli/program.js'
import { getAccountId } from '../util/account.js'
import { getCredentials } from '../util/credentials.js'
import { debug } from '../cli/logger.js'
import { style } from '../cli/style.js'
import { AppConfig, AppSchema } from './app.js'
import { findRootDir, setRoot } from '../util/path.js'
import { z } from 'zod'
import { Config } from './config.js'
import { readFile } from 'fs/promises'
import { glob } from 'glob'
import { StackConfig, StackSchema } from './stack.js'
import { setLocalBasePath } from './schema/local-file.js'
import { ConfigError, FileError } from '../cli/error.js'
import JSON5 from 'json5'

const readConfig = async (file: string) => {
	try {
		const json = await readFile(file, 'utf8')
		const data = JSON5.parse(json)

		return data
	} catch (error) {
		if (error instanceof Error) {
			throw new FileError(file, error.message)
		}

		throw error
	}
}

export const loadConfig = async (options: ProgramOptions): Promise<Config> => {
	debug('Find the root directory')

	const configFile = options.configFile || 'app.json'
	const root = await findRootDir(process.cwd(), configFile)

	setRoot(root)
	setLocalBasePath(root)

	debug('CWD:', style.info(root))

	debug('Load app config file')

	const appFileName = join(root, configFile)
	const appConfig = await readConfig(appFileName)

	debug('Validate app config file')

	let app: AppConfig
	try {
		app = await AppSchema.parseAsync(appConfig)
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new ConfigError(appFileName, error, appConfig)
		}

		throw error
	}

	debug('Load credentials', style.info(app.profile))
	const credentials = getCredentials(app.profile)

	debug('Load AWS account ID')
	const account = await getAccountId(credentials, app.region)
	debug('Account ID:', style.info(account))

	debug('Load stacks config files')

	const stackFiles = await glob(['**/stack.{json,jsonc,json5}', '**/*.stack.{json,jsonc,json5}'], {
		ignore: ['**/node_modules/**', '**/dist/**'],
		cwd: root,
	})

	const stacks: StackConfig[] = []

	for (const file of stackFiles) {
		debug(`Load stack: ${style.info(file)}`)

		const stackConfig = await readConfig(file)

		setLocalBasePath(join(process.cwd(), dirname(file)))

		try {
			const stack = await StackSchema.parseAsync(stackConfig)
			stacks.push(stack)
		} catch (error) {
			if (error instanceof z.ZodError) {
				throw new ConfigError(file, error, stackConfig)
			}

			throw error
		}
	}

	// const stacks = await Promise.all(
	// 	stackFiles.map(async file => {
	// 		const stackJson = await readFile(file, 'utf8')
	// 		const stackConfig = JSON.parse(stackJson)
	// 		let stack: StackConfig

	// 		try {
	// 			stack = await StackSchema.parseAsync(stackConfig)
	// 		} catch (error) {
	// 			if (error instanceof z.ZodError) {
	// 				throw new ConfigError(error, stackConfig)
	// 			}

	// 			throw error
	// 		}

	// 		return stack
	// 	})
	// )

	return {
		app,
		stacks,
		account,
		credentials,
	}
}
