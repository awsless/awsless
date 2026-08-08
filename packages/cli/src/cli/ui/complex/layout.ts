import { log } from '@awsless/clui'
import { AppConfig } from '../../../config/app.js'
import { loadAppConfig, loadStackConfigs } from '../../../config/load/load.js'
import { StackConfig } from '../../../config/stack.js'
import { validateFeatures } from '../../../feature/validate.js'
import { playErrorSound } from '../../../util/sound.js'
import { program, ProgramOptions } from '../../program.js'
import { logApp } from '../app.js'
import { logError } from '../error/error.js'
import { logo } from '../logo.js'
import { color } from '../style.js'

type Options = {
	options: ProgramOptions
	appConfig: AppConfig
	stackConfigs: StackConfig[]
}

export const layout = async (command: string, cb: (options: Options) => Promise<string | void>) => {
	console.log()
	log.intro(`${logo()} ${color.line(command)}`)

	try {
		const options = program.optsWithGlobals() as ProgramOptions
		const appConfig = await loadAppConfig(options)

		logApp(appConfig, options)

		const stackConfigs = await loadStackConfigs(options)

		validateFeatures({
			appConfig,
			stackConfigs,
		})

		const result = await cb({
			options,
			appConfig,
			stackConfigs,
		})

		log.outro(result ?? undefined)

		process.exit(0)
	} catch (error) {
		playErrorSound()
		logError(error)
		log.outro()

		process.exit(1)
	}
}
