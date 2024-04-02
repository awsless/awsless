import { intro, log, outro } from '@clack/prompts'
import { ProgramOptions, program } from '../../program.js'
import { loadAppConfig, loadStackConfigs } from '../../../config/load/load.js'
import { showApp } from '../app.js'
import { Cancelled, ConfigError } from '../../../error.js'
import { configError } from '../config-error.js'
import { color, icon } from '../style.js'
import { AppConfig } from '../../../config/app.js'
import { StackConfig } from '../../../config/stack.js'
import { logo } from '../logo.js'
import { wrap } from '../util.js'

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

		showApp(appConfig)

		const stackConfigs = await loadStackConfigs(options)

		const result = await cb({
			options,
			appConfig,
			stackConfigs,
		})

		outro(result ?? undefined)
		// console.log()
	} catch (error) {
		if (error instanceof ConfigError) {
			configError(error)
			outro()
		} else if (error instanceof Cancelled) {
			outro(color.error('Cancelled.'))
		} else if (error instanceof Error) {
			const message = `${error.name}: ${error.message}`
			const stack = error.stack ? color.dim(error.stack.replace(message, '')) : ''
			log.message(
				wrap([color.error(message), stack], {
					hard: true,
				}),
				{ symbol: color.error(icon.error) }
			)

			outro()
		} else if (typeof error === 'string') {
			log.message(wrap(color.error(error)), {
				symbol: color.error(icon.error),
			})
			outro()
		} else {
			// log.message(wrap(color.error('Unknown error')), {
			// 	symbol: color.error(icon.error),
			// })
			outro(wrap(color.error('Unknown error!')))
		}

		// process.exit(0)
	}
}
