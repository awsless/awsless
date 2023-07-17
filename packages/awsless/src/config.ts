import { join } from "path"
import { ProgramOptions } from "./cli/program"
import { AppConfig } from "./app"
import { getAccountId } from "./util/account"
import { Credentials, getCredentials } from "./util/credentials"
import { debug } from "./cli/logger"
import { load } from 'ts-import'
import { style } from "./cli/style"

export type Config = AppConfig & {
	stage: string
	account: string
	credentials: Credentials
}

export type AppConfigFactory = (options: ProgramOptions) => AppConfig | Promise<AppConfig>

type Module = {
	default: AppConfigFactory | AppConfig
}

export const importConfig = async (options: ProgramOptions): Promise<Config> => {

	debug('Import config file')

	const fileName = join(process.cwd(), options.configFile || 'awsless.config.ts')
	const module: Module = await load(fileName)
	const appConfig = typeof module.default === 'function' ? (await module.default({
		profile: options.profile,
		region: options.region,
		stage: options.stage,
	})) : module.default

	// debug('Validate config file')
	// Validate the config with superstruct...

	debug('Load credentials', style.info(appConfig.profile))
	const credentials = getCredentials(appConfig.profile)

	debug('Load AWS account ID')
	const account = await getAccountId(credentials, appConfig.region)
	debug('Account ID:', style.info(account))

	return {
		...appConfig,
		stage: appConfig.stage ?? 'prod',
		account,
		credentials,
	}
}
