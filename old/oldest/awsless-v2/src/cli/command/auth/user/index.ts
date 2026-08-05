import { Command } from 'commander'

import { create } from './create.js'

const commands = [create]

export const user = (program: Command) => {
	const command = program.command('user').description(`Manage auth users`)

	commands.forEach(cb => cb(command))
}
