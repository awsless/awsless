import { Command } from 'commander'

import { invoke } from './invoke.js'

const commands = [
	//
	invoke,
]

export const cron = (program: Command) => {
	const command = program.command('cron').description(`Manage crons`)

	commands.forEach(cb => cb(command))
}
