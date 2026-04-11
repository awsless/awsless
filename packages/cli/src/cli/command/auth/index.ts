import { Command } from 'commander'

import { user } from './user/index.js'

const commands = [user]

export const auth = (program: Command) => {
	const command = program.command('auth').description(`Manage auth`)

	commands.forEach(cb => cb(command))
}
