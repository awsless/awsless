
import { Command } from 'commander'
// import { build } from './command/build.js'
// import { bootstrap } from './command/bootstrap.js'
// import { status } from './command/status.js'
// import { deploy } from './command/deploy.js'
// import { config } from './command/config/index.js'
import { test } from './command/test.js'

export type ProgramOptions = {
	configFile?: string
	stage?: string
	profile?: string
	region?: string
	mute?: boolean
	verbose?: boolean
}

const program = new Command()

program.name('awsless')

program.option('--config-file <string>',	'The config file location')
program.option('--stage <string>',			'The stage to use, defaults to prod stage', 'prod')
program.option('--profile <string>',		'The AWS profile to use')
program.option('--region <string>', 		'The AWS region to use')
program.option('-m --mute',					'Mute sound effects')
program.option('-v --verbose',				'Print verbose logs')

program.on('option:verbose', () => {
	process.env.VERBOSE = program.opts().verbose ? '1' : undefined
})

const commands = [
	// bootstrap,
	// status,
	// build,
	// deploy,
	// config,
	// diff,
	// remove,
	test,
]

commands.forEach(command => command(program))

export { program }