import { Command } from 'commander'
import { exportTable } from './export.js'
import { importTable } from './import.js'

const commands = [importTable, exportTable]

export const state = (program: Command) => {
	const command = program.command('table').description(`Manage table data`)

	commands.forEach(cb => cb(command))
}
