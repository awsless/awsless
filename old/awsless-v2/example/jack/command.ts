import { CommandContext } from '../../src/command.js'

export default async (options: unknown, context: CommandContext) => {
	// console.log(options)
	// console.log(context)
	context.update('Lol')

	await new Promise(resolve => {
		setTimeout(resolve, 5000)
	})
}
