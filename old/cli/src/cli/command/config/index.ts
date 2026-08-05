import { Command } from 'commander'

import { set } from './set.js'
import { get } from './get.js'
import { del } from './delete.js'
import { list } from './list.js'
import { export_ } from './export.js'
import { import_ } from './import.js'

const commands = [
	//
	set,
	get,
	del,
	list,
	export_,
	import_,
]

export const config = (program: Command) => {
	const command = program.command('config').description(`Manage app config parameters`)

	commands.forEach(cb => cb(command))
}
