import { Command } from 'commander'

import { list } from './list.js'
import { deploy } from './deploy.js'

const commands = [
	//
	deploy,
	list,
]

export const domain = (program: Command) => {
	const command = program.command('domain').description(`Manage domains`)

	commands.forEach(cb => cb(command))
}
