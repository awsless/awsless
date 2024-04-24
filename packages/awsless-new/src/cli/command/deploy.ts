import { Command } from 'commander'
import { bootstrapAwsless } from '../ui/complex/bootstrap-awsless.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { layout } from '../ui/complex/layout.js'
import { buildAssets } from '../ui/complex/build-assets.js'
import { createApp } from '../../app.js'
import { WorkSpace, aws } from '@awsless/formation'
import { confirm } from '@clack/prompts'
import { color } from '../ui/style.js'
import { debug } from '../debug.js'
import { Cancelled } from '../../error.js'
import { Step, run } from 'promise-dag'
import { task } from '../ui/util.js'
import { runTests } from '../ui/complex/run-tests.js'
import { minutes } from '@awsless/duration'

export const deploy = (program: Command) => {
	program
		.command('deploy')
		.argument('[stacks...]', 'Optionally filter stacks to deploy')
		.description('Deploy your app to AWS')
		.action(async (filters: string[]) => {
			await layout('deploy', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const credentials = getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)

				// ---------------------------------------------------
				// deploy the bootstrap first...

				await bootstrapAwsless({ credentials, region })

				// ---------------------------------------------------

				const { app, tests, builders } = createApp({ appConfig, stackConfigs, accountId }, filters)

				const stackNames = [...app.stacks].map(stack => stack.name)
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

					if (!ok) {
						throw new Cancelled()
					}
				}

				// ---------------------------------------------------
				// Building stack assets & run tests

				const passed = await runTests(tests)

				if (!passed) {
					throw new Cancelled()
				}

				await buildAssets(builders)

				// ---------------------------------------------------

				const workspace = new WorkSpace({
					stateProvider: new aws.dynamodb.StateProvider({
						credentials,
						region,
						tableName: 'awsless-state',
					}),
					cloudProviders: aws.createCloudProviders({
						credentials,
						region: appConfig.region,
						timeout: minutes(60),
					}),
				})

				// await workspace.deployApp(app)

				// workspace.on('resource', event => {
				// 	console.log(event)
				// })

				// const graph: Record<string, Step[]> = {}
				// for (const stack of app.stacks) {
				// 	const deps: Step[] = []

				// 	if (stack.name !== 'base') {
				// 		deps.push('base')
				// 	}

				// 	graph[stack.name] = [
				// 		...deps,
				// 		async () => {
				// 			// console.log(stack.name)

				// 			await workspace.deployStack(stack)

				// 			// console.log(stack.name, 'DONE')
				// 		},
				// 	]
				// }

				await task('Deploying the stacks to AWS', async update => {
					// const results = await Promise.allSettled(Object.values(run(graph)))

					await workspace.deployApp(app)

					// for (const result of results) {
					// 	if (result.status === 'rejected') {
					// 		throw result.reason
					// 	}
					// }

					update('Done deploying the stacks to AWS.')
				})

				return 'Your app is ready!'
			})
		})
}
