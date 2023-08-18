import { join } from "path"
import { ProgramOptions } from './cli/program'
// import { AppConfig } from './app'
import { getAccountId } from './util/account'
import { Credentials, getCredentials } from './util/credentials'
import { debug } from './cli/logger'
// import { LoadMode, load } from 'ts-import'
import { style } from './cli/style'
import { AppConfigInput, AppConfigOutput, AppSchema } from './schema/app'
import { ExtendedConfigOutput } from './plugin'
import { defaultPlugins } from './plugins'
// import { LoadMode, load } from "ts-import"
// import { outDir } from './util/path'
// import { transformFile } from '@swc/core'
import { importFile } from "./util/import"
import { findRootDir, setRoot } from "./util/path"
// import { outDir } from "./util/path"

export type BaseConfig = AppConfigOutput & {
	account: string
	credentials: Credentials
}

export type Config = ExtendedConfigOutput<typeof defaultPlugins[number]['schema']>

export type AppConfigFactory<C = AppConfigInput> = (options: ProgramOptions) => C | Promise<C>

type Module = {
	default: AppConfigFactory | AppConfigInput
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

	const config = await schema.parseAsync(appConfig)

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
