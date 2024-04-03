import { intro, outro } from '@clack/prompts'
import { ProgramOptions, program } from '../../program.js'
import { loadAppConfig, loadStackConfigs } from '../../../config/load/load.js'
import { logApp } from '../app.js'
import { color } from '../style.js'
import { AppConfig } from '../../../config/app.js'
import { StackConfig } from '../../../config/stack.js'
import { logo } from '../logo.js'
import { logError } from '../error/error.js'

type Options = {
	options: ProgramOptions
	appConfig: AppConfig
	stackConfigs: StackConfig[]
}

export const layout = async (command: string, cb: (options: Options) => Promise<string | void>) => {
	console.log()
	intro(`${logo()} ${color.dim(command)}`)

	try {
		const options = program.optsWithGlobals() as ProgramOptions
		const appConfig = await loadAppConfig(options)

		logApp(appConfig)

		const stackConfigs = await loadStackConfigs(options)

		const result = await cb({
			options,
			appConfig,
			stackConfigs,
		})

		outro(result ?? undefined)
		// console.log()
	} catch (error) {
		logError(error)
		outro()
	}
}
