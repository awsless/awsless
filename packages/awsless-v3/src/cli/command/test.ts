import { Command } from 'commander'
import { createApp } from '../../app.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { layout } from '../ui/complex/layout.js'
import { runTests } from '../ui/complex/run-tests.js'

export const test = (program: Command) => {
	program
		.command('test')
		.argument('[stacks...]', 'Optionally filter stacks to test')
		.option('-f --filters <string...>', 'Optionally filter test files')
		.description('Test your app')
		.action(async (stacks?: string[], options?: { filters?: string[] }) => {
			await layout(`test ${stacks ?? ''}`, async props => {
				const region = props.appConfig.region
				const credentials = await getCredentials(props.appConfig.profile)
				const accountId = await getAccountId(credentials, region)

				const { tests } = createApp({ ...props, accountId })

				if (tests.length === 0) {
					return 'No tests found.'
				}

				await runTests(tests, stacks, options?.filters, {
					showLogs: true,
				})

				return 'All tests finished.'
			})
		})
}
