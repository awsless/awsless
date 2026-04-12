import { confirm, isCancel } from '@clack/prompts'
import { Command } from 'commander'
import wildstring from 'wildstring'
import { createApp } from '../../app.js'
import { Cancelled } from '../../error.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { createWorkSpace, pullRemoteState } from '../../util/workspace.js'
import { debug } from '../debug.js'
import { bootstrapAwsless } from '../ui/complex/bootstrap-awsless.js'
import { buildAssets } from '../ui/complex/build-assets.js'
import { layout } from '../ui/complex/layout.js'
import { runTests } from '../ui/complex/run-tests.js'
import { color } from '../ui/style.js'
import { task } from '../ui/util.js'

export const deploy = (program: Command) => {
	program
		.command('deploy')
		.argument('[stacks...]', 'Optionally filter stacks to deploy')
		.option('--skip-tests', 'Skip tests')
		.description('Deploy your app to AWS')
		.action(async (filters: string[], options: { skipTests: boolean }) => {
			await layout('deploy', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const credentials = getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)

				// ---------------------------------------------------
				// deploy the bootstrap first...

				await bootstrapAwsless({ credentials, region, accountId })

				// ---------------------------------------------------

				const { app, tests, builders } = createApp({ appConfig, stackConfigs, accountId })

				const stackNames = app.stacks
					.filter(stack => {
						return !!filters.find(f => wildstring.match(f, stack.name))
					})
					.map(s => s.name)
				const formattedFilter = stackNames.map(i => color.info(i)).join(color.dim(', '))
				debug('Stacks to deploy', formattedFilter)

				if (!process.env.SKIP_PROMPT) {
					const deployAll = filters.length === 0
					const deploySingle = filters.length === 1
					const ok = await confirm({
						message: deployAll
							? `Are you sure you want to deploy ${color.warning('all')} stacks?`
							: deploySingle
								? `Are you sure you want to deploy the ${formattedFilter} stack?`
								: `Are you sure you want to deploy the [ ${formattedFilter} ] stacks?`,
					})

					if (!ok || isCancel(ok)) {
						throw new Cancelled()
					}
				}

				// ---------------------------------------------------
				// Building stack assets & run tests

				if (!options.skipTests) {
					const passed = await runTests(tests, filters)

					if (!passed) {
						throw new Cancelled()
					}
				}

				await buildAssets(builders, filters)

				// ---------------------------------------------------

				const { workspace, stateProvider } = createWorkSpace({
					credentials,
					accountId,
					region,
				})

				workspace.deployApp(app, { filters: ['zones'] })

				await task('Deploying the stacks to AWS', async update => {
					await workspace.deployApp(app, {
						filters,
					})

					await pullRemoteState(app, stateProvider)

					update('Done deploying the stacks to AWS.')
				})

				return 'Your app is ready!'
			})
		})
}
