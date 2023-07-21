import { join } from "path"
import { ProgramOptions } from './cli/program.js'
// import { AppConfig } from './app.js'
import { getAccountId } from './util/account.js'
import { Credentials, getCredentials } from './util/credentials.js'
import { debug } from './cli/logger.js'
import { load } from 'ts-import'
import { style } from './cli/style.js'
import { AppConfigInput, AppConfigOutput, AppSchema } from './schema/app.js'
import { ExtendedConfigOutput } from './plugin.js'
import { defaultPlugins } from './plugins/index.js'
import { outDir } from './util/path.js'

export type BaseConfig = AppConfigOutput & {
	account: string
	credentials: Credentials
}

export type Config = ExtendedConfigOutput<typeof defaultPlugins[number]['schema']>

export type AppConfigFactory = (options: ProgramOptions) => AppConfigInput | Promise<AppConfigInput>

type Module = {
	default: AppConfigFactory | AppConfigInput
}

export const importConfig = async (options: ProgramOptions): Promise<Config> => {

	debug('Import config file')

	const fileName = join(process.cwd(), options.configFile || 'awsless.config.ts')
	const module: Module = await load(fileName, {
		transpileOptions: {
			cache: {
				dir: join(outDir, 'config')
			}
		}
	})

	const appConfig = typeof module.default === 'function' ? (await module.default({
		profile: options.profile,
		region: options.region,
		stage: options.stage,
	})) : module.default

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
	debug('Final config:', config.stacks);

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
