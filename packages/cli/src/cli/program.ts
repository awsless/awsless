import { Command } from 'commander'
import { commands } from './command/index.js'
import { logo } from './ui/logo.js'

export type ProgramOptions = {
	configFile?: string
	stage?: string
	// profile?: string
	// region?: string
	mute?: boolean
}

const program = new Command()

program.name(logo())

program.option('--config-file <string>', 'The app config file location')
program.option('--stage <string>', 'The stage to use')
// program.option('--profile <string>', 'The AWS profile to use')
// program.option('--region <string>', 'The AWS region to use')
program.option('-c --no-cache', 'Always build & test without the cache')
program.option('-s --skip-prompt', 'Skip prompts')
// program.option('-m --mute', 'Mute sound effects')

program.exitOverride(error => {
	process.exit(error.exitCode)
})

program.on('option:skip-prompt', () => {
	if (program.opts().skipPrompt) {
		process.env.SKIP_PROMPT = '1'
	} else {
		delete process.env.SKIP_PROMPT
	}
})

program.on('option:no-cache', () => {
	if (program.opts().cache === false) {
		process.env.NO_CACHE = '1'
	} else {
		delete process.env.NO_CACHE
	}
})

commands.forEach(fn => fn(program))

export { program }
