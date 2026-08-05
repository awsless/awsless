import { Command } from 'commander'
import { toApp } from '../../app.js'
import { StackClient } from '../../formation/client.js'
import { debug } from '../logger.js'
import { layout } from '../__ui/layout/layout.js'
import { assetBuilder } from '../__ui/complex/builder.js'
import { cleanUp } from '../../util/cleanup.js'
import { dialog, loadingDialog } from '../__ui/layout/dialog.js'
import { templateBuilder } from '../__ui/complex/template.js'
// import { stacksDeployer } from '../ui/complex/deployer.js'
import { typesGenerator } from '../__ui/complex/types.js'
import { runTaskGroup } from '../__ui/complex/task-group.js'

export const status = (program: Command) => {
	program
		.command('status')
		.argument('[stacks...]', 'Optionally filter stacks to lookup status')
		.description('View the app status')
		.action(async (filters: string[]) => {
			await layout(async (config, write, term) => {
				const { app, deploymentLine } = await toApp(config, filters)

				// --------------------------------------------------------
				// Build stack assets

				await cleanUp()
				await write(typesGenerator(config))
				await write(assetBuilder(app))
				await write(templateBuilder(app))

				// --------------------------------------------------------
				// Get stack statuses

				const doneLoading = write(loadingDialog('Loading stack information...'))

				const client = new StackClient(app, config.account, config.app.region, config.credentials)
				let hasUndeployedChanges = false

				debug('Load metadata for all deployed stacks on AWS')

				term.out.gap()

				await write(
					runTaskGroup(
						5,
						deploymentLine.flat().map(stack => ({
							label: stack.name,
							task: async update => {
								update('Loading...')
								const info = await client.get(stack.name, stack.region)

								if (!info) {
									update('NON EXISTENT')
									hasUndeployedChanges = true
									return 'fail'
								} else if (info.template !== stack.toString()) {
									update('OUT OF DATE')
									hasUndeployedChanges = true
									return 'warn'
								} else {
									update('UP TO DATE')
									return 'done'
								}
							},
						}))
					)
				)

				term.out.gap()

				doneLoading('Done loading stack information')
				debug('Done loading data for all deployed stacks on AWS')

				if (hasUndeployedChanges) {
					write(dialog('warning', ['Your app has undeployed changes !!!']))
				} else {
					write(dialog('success', ['Your app has not been changed']))
				}
			})
		})
}
