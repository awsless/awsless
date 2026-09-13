import { Command } from 'commander'
import { createApp } from '../../app.js'
import { LOCAL_ACCOUNT_ID } from '../../dev/util.js'
import { ExpectedError } from '../../error.js'
import { withTestEnvironment } from '../../test/environment.js'
import { layout } from '../ui/complex/layout.js'
import { createTestEnv, runTests } from '../ui/complex/run-tests.js'

export const test = (program: Command) => {
	program
		.command('test')
		.argument('[stacks...]', 'Optionally filter stacks to test')
		.option('-f --filters <string...>', 'Optionally filter test files')
		.description('Test your app')
		.action(async (stacks?: string[], options?: { filters?: string[] }) => {
			await layout(`test ${stacks?.join(' ') ?? ''}`, async ({ appConfig, stackConfigs }) => {
				// Tests run fully local, so the synth uses the same fake
				// account as the dev environment instead of aws credentials.
				const accountId = LOCAL_ACCOUNT_ID

				const { tests, appId } = createApp({ appConfig, stackConfigs, accountId })

				if (tests.length === 0) {
					return 'No tests found.'
				}

				const passed = await withTestEnvironment(
					appConfig,
					stackConfigs,
					({ manifest, manifestFile, ensureReady }) => {
						return runTests(tests, stacks, options?.filters, {
							showLogs: true,
							manifest,
							ensureReady,
							env: createTestEnv({ appConfig, appId, accountId, manifestFile }),
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
