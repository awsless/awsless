import { Command } from 'commander'
import { credentials } from './credentials/index.js'

const commands = [credentials]

export const remoteAgent = (program: Command) => {
	const command = program
		.command('remote-agent')
		.description('Manage the setup for remote agents, like the Claude cloud sandbox')

	commands.forEach(cb => cb(command))
}
