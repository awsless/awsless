import { Command } from 'commander'

import { create } from './create.js'
import { update } from './update.js'
import { del } from './delete.js'

const commands = [create, update, del]

export const user = (program: Command) => {
	const command = program.command('user').description(`Manage auth users`)

	commands.forEach(cb => cb(command))
}
