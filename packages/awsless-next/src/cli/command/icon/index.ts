import { Command } from 'commander'

import { clearCache } from './clear-cache.js'

const commands = [clearCache]

export const icon = (program: Command) => {
	const command = program.command('icon').description(`Manage icon proxies`)

	commands.forEach(cb => cb(command))
}
