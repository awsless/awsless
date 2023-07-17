import { Command } from "commander"

import { set } from './set'
import { get } from './get'
import { del } from './delete'
import { list } from './list'

const commands = [
	set,
	get,
	del,
	list,
]

export const config = (program: Command) => {
	const command = program
		.command('config')
		.description('Manage config values')

	commands.forEach(cb => cb(command))
}
