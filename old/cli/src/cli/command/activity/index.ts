import { Command } from 'commander'

import { logs } from './logs.js'

const commands = [logs]

export const activity = (program: Command) => {
	const command = program.command('activity').description(`Manage activity logs`)

	commands.forEach(cb => cb(command))
}
