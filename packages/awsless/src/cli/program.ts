
import { Command } from 'commander'
import { build } from './command/build.js'
import { bootstrap } from './command/bootstrap.js'
import { status } from './command/status.js'
import { deploy } from './command/deploy.js'
import { secrets } from './command/secrets/index.js'
import { test } from './command/test.js'
import { logo } from './ui/layout/logo.js'
import { types } from './command/types.js'
import { dev } from './command/dev.js'

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

program.option('--config-file <string>',	'The config file location')
program.option('--stage <string>',			'The stage to use, defaults to prod stage', 'prod')
program.option('--profile <string>',		'The AWS profile to use')
program.option('--region <string>', 		'The AWS region to use')
program.option('-m --mute',					'Mute sound effects')
program.option('-v --verbose',				'Print verbose logs')

program.exitOverride(() => {
	process.exit(0)
})

program.on('option:verbose', () => {
	process.env.VERBOSE = program.opts().verbose ? '1' : undefined
})

const commands = [
	bootstrap,
	status,
	types,
	build,
	deploy,
	dev,
	secrets,

	test,

	// diff,
	// remove,
]

commands.forEach(fn => fn(program))

export { program }
