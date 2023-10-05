import { join } from "path"
import { ProgramOptions } from './cli/program.js'
// import { AppConfig } from './app.js'
import { getAccountId } from './util/account.js'
import { Credentials, getCredentials } from './util/credentials.js'
import { debug } from './cli/logger.js'
// import { LoadMode, load } from 'ts-import'
import { style } from './cli/style.js'
import { AppConfigInput, AppConfigOutput, AppSchema } from './schema/app.js'
import { ExtendedConfigOutput } from './plugin.js'
import { defaultPlugins } from './plugins/index.js'
// import { LoadMode, load } from "ts-import"
// import { outDir } from './util/path.js'
// import { transformFile } from '@swc/core'
import { importFile, watchFile } from './util/import.js'
import { findRootDir, setRoot } from './util/path.js'
import { z } from "zod"
// import { outDir } from './util/path.js'

export type BaseConfig = AppConfigOutput & {
	account: string
	credentials: Credentials
}

export type Config = ExtendedConfigOutput<typeof defaultPlugins[number]['schema']>

export type AppConfigFactory<C = AppConfigInput> = (options: ProgramOptions) => C | Promise<C>

export type Module = {
	default: AppConfigFactory | AppConfigInput
}

export class ConfigError extends Error {
	constructor(readonly error: z.ZodError, readonly data: any) {
		super(error.message)
	}
}

export const importConfig = async (options: ProgramOptions): Promise<Config> => {

	debug('Find the root directory')

	const configFile = options.configFile || 'awsless.config.ts'
	const root = await findRootDir(process.cwd(), configFile)
	setRoot(root)

	debug('CWD:', style.info(root))

	debug('Import config file')

	const fileName = join(root, configFile)
	const module: Module = await importFile(fileName)

	const appConfig = typeof module.default === 'function'
		? (await module.default(options))
		: module.default

	debug('Validate config file')

	const plugins = [
		...defaultPlugins,
		...(appConfig.plugins || [])
	]

	let schema = AppSchema

	for(const plugin of plugins) {
		if(plugin.schema) {
			// @ts-ignore
			schema = schema.and(plugin.schema)
		}
	}

	let config
	try {
		config = await schema.parseAsync(appConfig)
	} catch(error) {
		if(error instanceof z.ZodError) {
			throw new ConfigError(error, appConfig)
		}

		throw error
	}

	debug('Load credentials', style.info(config.profile))
	const credentials = getCredentials(config.profile)

	debug('Load AWS account ID')
	const account = await getAccountId(credentials, config.region)
	debug('Account ID:', style.info(account))

	return {
		...config,
		account,
		credentials,
	}
}

export const watchConfig = async function* (options: ProgramOptions): AsyncGenerator<Config> {

	debug('Find the root directory')

	const configFile = options.configFile || 'awsless.config.ts'
	const root = await findRootDir(process.cwd(), configFile)
	setRoot(root)

	debug('CWD:', style.info(root))

	debug('Import config file')

	const fileName = join(root, configFile)

	for await(const module of watchFile(fileName)) {
		const appConfig = typeof module.default === 'function'
			? (await module.default(options))
			: module.default

		debug('Validate config file')

		const plugins = [
			...defaultPlugins,
			...(appConfig.plugins || [])
		]
		let schema = AppSchema

		for(const plugin of plugins) {
			if(plugin.schema) {
				// @ts-ignore
				schema = schema.and(plugin.schema)
			}
		}

		let config
		try {
			config = await schema.parseAsync(appConfig)
		} catch(error) {
			if(error instanceof z.ZodError) {
				throw new ConfigError(error, appConfig)
			}

			throw error
		}

		debug('Load credentials', style.info(config.profile))
		const credentials = getCredentials(config.profile)

		debug('Load AWS account ID')
		const account = await getAccountId(credentials, config.region)
		debug('Account ID:', style.info(account))

		yield {
			...config,
			account,
			credentials,
		}
	}
}
