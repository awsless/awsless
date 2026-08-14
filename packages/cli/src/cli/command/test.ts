import { Command } from 'commander'
import { createApp } from '../../app.js'
import { LOCAL_ACCOUNT_ID } from '../../dev/util.js'
import { ExpectedError } from '../../error.js'
import { withTestEnvironment } from '../../test/environment.js'
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
				// Tests run fully local against the auto test environment,
				// so they never need aws credentials - the same fake
				// account as the dev environment feeds the synth.
				const accountId = LOCAL_ACCOUNT_ID

				const { tests, appId } = createApp({ ...props, accountId })

				if (tests.length === 0) {
					return 'No tests found.'
				}

				const passed = await withTestEnvironment(
					props.appConfig,
					props.stackConfigs,
					({ manifest, manifestFile }) => {
						return runTests(tests, stacks, options?.filters, {
							showLogs: true,
							manifest,
							env: {
								APP: props.appConfig.name,
								APP_ID: appId,
								AWS_REGION: props.appConfig.region,
								AWS_ACCOUNT_ID: accountId,
								AWSLESS_TEST_MANIFEST: manifestFile,
							},
						})
					}
				)

				if (!passed) {
					throw new ExpectedError('Tests failed.')
				}

				return 'All tests finished.'
			})
		})
}
