import { Command } from 'commander'
import { layout } from '../ui/layout/layout.js'
import { toApp } from '../../app.js'
import { runTester } from '../ui/complex/tester.js'
import { dialog } from '../ui/layout/dialog.js'

export const test = (program: Command) => {
	program
		.command('test')
		.argument('[stacks...]', 'Optionally filter stacks to test')
		.option('-f --filters <string...>', 'Optionally filter test files')
		.description('Test your app')
		.action(async (stacks: string[], options?: { filters?: string[] }) => {
			await layout(async (config, write) => {
				const { tests } = await toApp(config, stacks)

				if (tests.size === 0) {
					write(dialog('warning', ['No tests found']))
					return
				}

				await write(runTester(tests, options?.filters))
			})
		})
}
