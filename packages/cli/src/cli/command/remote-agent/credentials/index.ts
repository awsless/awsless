import { Command } from 'commander'
import { create } from './create.js'
import { del } from './delete.js'
import { rotate } from './rotate.js'

const commands = [create, rotate, del]

export const credentials = (program: Command) => {
	const command = program
		.command('credentials')
		.description('Manage the AWS credentials a remote agent uses for the dev & test commands')

	commands.forEach(cb => cb(command))
}
