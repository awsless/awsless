import { log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import wildstring from 'wildstring'
import { createApp } from '../../app.js'
import { Cancelled, ExpectedError } from '../../error.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { playSuccessSound } from '../../util/sound.js'
import { createWorkSpace, pullRemoteState } from '../../util/workspace.js'
import { debug } from '../debug.js'
import { bootstrapAwsless } from '../ui/complex/bootstrap-awsless.js'
import { buildAssets } from '../ui/complex/build-assets.js'
import { layout } from '../ui/complex/layout.js'
import { runTests } from '../ui/complex/run-tests.js'
import { showWarnings } from '../ui/complex/show-warnings.js'
import { color } from '../ui/style.js'

export const deploy = (program: Command) => {
	program
		.command('deploy')
		.argument('[stacks...]', 'Optionally filter stacks to deploy')
		.option('--skip-tests', 'Skip tests')
		.option('--import', 'Import already existing resources')
		.description('Deploy your app to AWS')
		.action(async (filters: string[], options: { skipTests: boolean; import: boolean }) => {
			await layout('deploy', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				// ---------------------------------------------------
				// deploy the bootstrap first...

				await bootstrapAwsless({ credentials, region, accountId })

				// ---------------------------------------------------

				const { app, tests, warnings, builders, ready } = createApp({
					appConfig,
					stackConfigs,
					accountId,
					import: options.import,
				})

				await showWarnings(warnings)

				const stackNames = app.stacks
					.filter(stack => {
						return !!filters.find(f => wildstring.match(f, stack.name))
					})
					.map(s => s.name)

				const formattedFilter = stackNames.map(i => color.info(i)).join(color.dim(', '))
				debug('Stacks to deploy', formattedFilter)

				if (filters.length > 0 && stackNames.length === 0) {
					throw new ExpectedError(`The stack filters provided didn't match.`)
				}

				if (!process.env.SKIP_PROMPT) {
					const deployAll = filters.length === 0
					const deploySingle = filters.length === 1
					const ok = await prompt.confirm({
						message: deployAll
							? `Are you sure you want to deploy ${color.warning('all')} stacks?`
							: deploySingle
								? `Are you sure you want to deploy the ${formattedFilter} stack?`
								: `Are you sure you want to deploy the [ ${formattedFilter} ] stacks?`,
					})

					if (!ok) {
						throw new Cancelled()
					}
				}

				// ---------------------------------------------------
				// Building stack assets & run tests

				if (!options.skipTests) {
					const passed = await runTests(tests, filters, [], {
						showLogs: false,
					})

					if (!passed) {
						throw new Cancelled()
					}
				}

				await buildAssets(builders, filters)

				// ---------------------------------------------------
				// call ready after the builds

				ready()

				// ---------------------------------------------------

				const { workspace, state } = await createWorkSpace({
					credentials,
					accountId,
					region,
				})

				await log.task({
					initialMessage: 'Deploying the stacks to AWS',
					successMessage: 'Done deploying the stacks to AWS.',
					async task() {
						await workspace.deploy(app, {
							filters: stackNames,
						})

						await pullRemoteState(app, state)
					},
				})

				playSuccessSound()

				return 'Your app is ready!'
			})
		})
}
