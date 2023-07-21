import { Command } from "commander"

import { set } from './set.js'
import { get } from './get.js'
import { del } from './delete.js'
import { list } from './list.js'

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
