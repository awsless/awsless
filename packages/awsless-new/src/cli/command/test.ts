import { Command } from 'commander'
import { createApp } from '../../app.js'
import { layout } from '../ui/complex/layout.js'
import { runTests } from '../ui/complex/run-tests.js'

export const test = (program: Command) => {
	program
		.command('test')
		.argument('[stacks...]', 'Optionally filter stacks to test')
		.option('-f --filters <string...>', 'Optionally filter test files')
		.description('Test your app')
		.action(async (stacks: string[], options?: { filters?: string[] }) => {
			await layout('test', async props => {
				const { tests } = createApp(props, stacks)

				if (tests.length === 0) {
					// log.warn('No tests found.')
					return 'No tests found.'
				}

				await runTests(tests, options?.filters)

				return ''
			})
		})
}
