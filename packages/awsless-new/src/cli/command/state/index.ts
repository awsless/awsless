import { Command } from 'commander'

import { pull } from './pull.js'
import { push } from './push.js'

const commands = [pull, push]

export const state = (program: Command) => {
	const command = program.command('state').description(`Manage app state`)

	commands.forEach(cb => cb(command))
}
