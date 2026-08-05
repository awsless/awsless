import { Command } from 'commander'

import { clearCache } from './clear-cache.js'

const commands = [clearCache]

export const image = (program: Command) => {
	const command = program.command('image').description(`Manage image proxies`)

	commands.forEach(cb => cb(command))
}
