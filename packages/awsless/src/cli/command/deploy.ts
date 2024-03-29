import { Command } from 'commander'
import { toApp } from '../../app.js'
import { debug } from '../logger.js'
import { bootstrapDeployer } from '../ui/complex/bootstrap.js'
import { layout } from '../ui/layout/layout.js'
import { loadingDialog } from '../ui/layout/dialog.js'
import { confirmPrompt } from '../ui/prompt/confirm.js'
import { style } from '../style.js'
import { Cancelled } from '../error.js'
import { StackClient } from '../../formation/client.js'
import { assetBuilder } from '../ui/complex/builder.js'
import { cleanUp } from '../../util/cleanup.js'
import { templateBuilder } from '../ui/complex/template.js'
import { assetPublisher } from '../ui/complex/publisher.js'
import { typesGenerator } from '../ui/complex/types.js'
import { runTester } from '../ui/complex/tester.js'
import { runTaskGroup } from '../ui/complex/task-group.js'

export const deploy = (program: Command) => {
	program
		.command('deploy')
		.argument('[stacks...]', 'Optionally filter stacks to deploy')
		.description('Deploy your app to AWS')
		.action(async (filters: string[]) => {
			await layout(async (config, write, term) => {
				// ---------------------------------------------------
				// deploy the bootstrap first...

				await write(bootstrapDeployer(config))

				// ---------------------------------------------------

				const { app, deploymentLine, tests } = await toApp(config, filters)

				const stackNames = app.stacks.map(stack => stack.name)
				const formattedFilter = stackNames.map(i => style.info(i)).join(style.placeholder(', '))
				debug('Stacks to deploy', formattedFilter)

				if (!process.env.SKIP_PROMPT) {
					const deployAll = filters.length === 0
					const deploySingle = filters.length === 1
					const confirm = await write(
						confirmPrompt(
							deployAll
								? `Are you sure you want to deploy ${style.warning('all')} stacks?`
								: deploySingle
								? `Are you sure you want to deploy the ${formattedFilter} stack?`
								: `Are you sure you want to deploy the [ ${formattedFilter} ] stacks?`
						)
					)

					if (!confirm) {
						throw new Cancelled()
					}
				}

				// ---------------------------------------------------
				// Building stack assets & templates & tests

				await cleanUp()
				await write(typesGenerator(config))

				const passed = await write(runTester(tests))

				if (!passed) {
					throw new Cancelled()
				}

				await write(assetBuilder(app))
				await write(assetPublisher(config, app))
				await write(templateBuilder(app))

				// ---------------------------------------------------

				const doneDeploying = write(loadingDialog('Deploying stacks to AWS...'))

				const client = new StackClient(app, config.account, config.app.region, config.credentials)

				term.out.gap()

				for (const stacks of deploymentLine) {
					await write(
						runTaskGroup(
							5,
							stacks.map(stack => ({
								label: stack.name,
								task: async update => {
									update('deploying...')

									await client.deploy(stack)

									// try {
									// } catch (error) {
									// 	debugError(error)
									// 	if (error instanceof Error) {
									// 		update(error.message)
									// 	} else {
									// 		update('failed')
									// 	}

									// 	throw error
									// }

									update('deployed')
									return 'done'
								},
							}))
						)
					)
				}

				term.out.gap()

				// const ui = write(stacksDeployer(deploymentLine))

				// for (const line of deploymentLine) {
				// 	const results = await Promise.allSettled(
				// 		line.map(async stack => {
				// 			const item = ui[stack.name]

				// 			item.start('deploying')

				// 			try {
				// 				await client.deploy(stack)
				// 			} catch (error) {
				// 				debugError(error)
				// 				item.fail('failed')
				// 				throw error
				// 			}

				// 			item.done('deployed')
				// 		})
				// 	)

				// 	for (const result of results) {
				// 		if (result.status === 'rejected') {
				// 			throw result.reason
				// 		}
				// 	}
				// }

				// const ui = write(stacksDeployer(deploymentLine))

				// for (const line of deploymentLine) {
				// 	const results = await Promise.allSettled(
				// 		line.map(async stack => {
				// 			const item = ui[stack.name]

				// 			item.start('deploying')

				// 			try {
				// 				await client.deploy(stack)
				// 			} catch (error) {
				// 				debugError(error)
				// 				item.fail('failed')
				// 				throw error
				// 			}

				// 			item.done('deployed')
				// 		})
				// 	)

				// 	for (const result of results) {
				// 		if (result.status === 'rejected') {
				// 			throw result.reason
				// 		}
				// 	}
				// }

				doneDeploying('Done deploying stacks to AWS')
			})
		})
}
