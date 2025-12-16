import { Command } from 'commander'

import { importTable } from './import.js'
import { exportTable } from './export.js'

const commands = [importTable, exportTable]

export const state = (program: Command) => {
	const command = program.command('table').description(`Manage table data`)

	commands.forEach(cb => cb(command))
}
