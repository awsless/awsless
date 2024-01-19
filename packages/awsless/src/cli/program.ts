import { Command } from 'commander'
import { build } from './command/build.js'
import { bootstrap } from './command/bootstrap.js'
import { status } from './command/status.js'
import { deploy } from './command/deploy.js'
import { config } from './command/config/index.js'
import { test } from './command/test.js'
import { logo } from './ui/layout/logo.js'
import { types } from './command/types.js'
import { dev } from './command/dev.js'
import { del } from './command/delete.js'

export type ProgramOptions = {
	configFile?: string
	stage?: string
	profile?: string
	region?: string
	mute?: boolean
	verbose?: boolean
}

const program = new Command()

program.name(logo().join('').replace(/\s+/, ''))

program.option('--config-file <string>', 'The app config file location')
program.option('--stage <string>', 'The stage to use, defaults to prod stage', 'prod')
program.option('--profile <string>', 'The AWS profile to use')
program.option('--region <string>', 'The AWS region to use')
program.option('-c --no-cache', 'Always build & test without the cache')
program.option('-s --skip-prompt', 'Skip prompts')
program.option('-v --verbose', 'Print verbose logs')
// program.option('-m --mute', 'Mute sound effects')

program.exitOverride(() => {
	process.exit(0)
})

program.on('option:verbose', () => {
	process.env.VERBOSE = program.opts().verbose ? '1' : undefined
})

program.on('option:skip-prompt', () => {
	process.env.SKIP_PROMPT = program.opts().skipPrompt ? '1' : undefined
})

program.on('option:no-cache', () => {
	process.env.NO_CACHE = program.opts().noCache ? '1' : undefined
})

const commands = [
	bootstrap,
	status,
	types,
	build,
	deploy,
	del,
	dev,
	config,
	test,

	// diff,
	// remove,
]

commands.forEach(fn => fn(program))

export { program }
