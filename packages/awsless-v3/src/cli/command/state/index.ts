import { Command } from 'commander'

import { pull } from './pull.js'
import { push } from './push.js'
import { unlock } from './unlock.js'
import { refresh } from './refresh.js'

const commands = [pull, push, unlock, refresh]

export const state = (program: Command) => {
	const command = program.command('state').description(`Manage app state`)

	commands.forEach(cb => cb(command))
}
