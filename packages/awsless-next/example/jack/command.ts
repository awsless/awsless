import { task } from '../../src/cli/ui/util.js'
import { CommandContext } from '../../src/command.js'

export default async (context: CommandContext) => {
	// console.log(options)
	// console.log(context)
	// context.update('Lol')

	await task('Loading...', async update => {
		await new Promise(resolve => {
			setTimeout(resolve, 5000)
		})

		update('Done')
	})
}
