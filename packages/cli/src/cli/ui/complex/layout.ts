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

	// Ends the run without the outro, for commands whose output must
	// stay untouched, like a raw json dump or a handed-over terminal.
	exit: (code?: number) => never
}

export const layout = async (command: string, cb: (options: Options) => Promise<string | void>) => {
	console.log()
	log.intro(`${logo()} ${color.line(command)}`)

	// The prompt library answers a raw mode ctrl-c with exit(0), so a command
	// only earns a zero once it reaches the end.
	let completed = false

	process.on('exit', code => {
		if (code === 0 && !completed) {
			process.exitCode = 130
		}
	})

	const exit = (code = 0): never => {
		completed = true
		process.exit(code)
	}

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
			exit,
		})

		log.outro(result ?? undefined)

		exit(0)
	} catch (error) {
		completed = true
		playErrorSound()
		logError(error)
		log.outro()

		process.exit(1)
	}
}
