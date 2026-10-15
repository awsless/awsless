import { log } from '@awsless/clui'
import { Command } from 'commander'
import wildstring from 'wildstring'
import { createApp } from '../../app.js'
import { LOCAL_ACCOUNT_ID } from '../../dev/util.js'
import { ExpectedError } from '../../error.js'
import { withTestEnvironment } from '../../test/environment.js'
import { getCredentials } from '../../util/aws.js'
import { SsmStore } from '../../util/ssm.js'
import { layout } from '../ui/complex/layout.js'
import { createTestEnv, runTests } from '../ui/complex/run-tests.js'

export const evaluate = (program: Command) => {
	program
		.command('eval')
		.argument('[stacks...]', 'Optionally filter stacks to evaluate')
		.option('-f --filters <string...>', 'Optionally filter eval files')
		.description('Evaluate your app against real AI models')
		.action(async (stacks?: string[], options?: { filters?: string[] }) => {
			await layout(`eval ${stacks?.join(' ') ?? ''}`, async ({ appConfig, stackConfigs }) => {
				// Only the config values come from aws, everything else runs
				// on the same local mocks as the tests.
				const accountId = LOCAL_ACCOUNT_ID

				const { evals, appId } = createApp({ appConfig, stackConfigs, accountId })

				const selected = evals.filter(entry => {
					return !stacks?.length || stacks.some(filter => wildstring.match(filter, entry.stackName))
				})

				if (selected.length === 0) {
					return 'No evals found.'
				}

				const names = new Set(selected.flatMap(entry => entry.configs))
				let values: Record<string, string> = {}

				if (names.size > 0) {
					const credentials = await getCredentials(appConfig.profile)
					const params = new SsmStore({ credentials, appConfig })

					values = await log.task({
						initialMessage: 'Loading config values...',
						successMessage: 'Done loading config values.',
						errorMessage: 'Failed loading config values.',
						task: () => params.list(),
					})

					const missing = [...names].filter(name => !(name in values))

					if (missing.length > 0) {
						throw new ExpectedError(
							`The following config values haven't been set yet: [ ${missing.join(', ')} ]. Set them with "awsless config set <name>".`
						)
					}
				}

				const passed = await withTestEnvironment(
					appConfig,
					stackConfigs,
					({ manifest, manifestFile, ensureReady }) => {
						return runTests(
							selected.map(entry => ({
								...entry,
								// Each stack only sees the config values it asked for.
								env: {
									AWSLESS_EVAL_CONFIGS: JSON.stringify(
										Object.fromEntries(entry.configs.map(name => [name, values[name]!]))
									),
								},
							})),
							[],
							options?.filters,
							{
								kind: 'eval',
								showLogs: true,
								manifest,
								ensureReady,
								env: createTestEnv({ appConfig, appId, accountId, manifestFile }),
							}
						)
					}
				)

				if (!passed) {
					throw new ExpectedError('Evals failed.')
				}

				return 'All evals finished.'
			})
		})
}
