import { Command } from 'commander'

import { list } from '../list.js'

const commands = [list]

export const resource = (program: Command) => {
	const command = program.command('resource').description(`Manage app resources`)

	commands.forEach(cb => cb(command))
}
