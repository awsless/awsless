import { Command } from 'commander'
import { toApp } from '../../app.js'
import { StackClient } from '../../formation/client.js'
import { debug } from '../logger.js'
import { layout } from '../ui/layout/layout.js'
import { assetBuilder } from '../ui/complex/builder.js'
import { cleanUp } from '../../util/cleanup.js'
import { dialog, loadingDialog } from '../ui/layout/dialog.js'
import { templateBuilder } from '../ui/complex/template.js'
import { stacksDeployer } from '../ui/complex/deployer.js'

export const status = (program: Command) => {
	program
		.command('status')
		.argument('[stacks...]', 'Optionally filter stacks to lookup status')
		.description('View the app status')
		.action(async (filters: string[]) => {
			await layout(async (config, write) => {
				const { app, deploymentLine } = await toApp(config, filters)

				// --------------------------------------------------------
				// Build stack assets

				await cleanUp()
				await write(assetBuilder(app))
				await write(templateBuilder(app))

				// --------------------------------------------------------
				// Get stack statuses

				const doneLoading = write(loadingDialog('Loading stack information...'))

				const client = new StackClient(app, config.account, config.app.region, config.credentials)
				const statuses: Array<'non-existent' | 'out-of-date' | 'up-to-date'> = []

				// render the stacks with a loading state
				const ui = write(stacksDeployer(deploymentLine))

				debug('Load metadata for all deployed stacks on AWS')

				await Promise.all(
					app.stacks.map(async stack => {
						const item = ui[stack.name]

						item.start('loading')

						const info = await client.get(stack.name, stack.region)

						// await new Promise(resolve => setTimeout(resolve, i * 1000))

						if (!info) {
							item.fail('NON EXISTENT')
							statuses.push('non-existent')
						} else if (info.template !== stack.toString()) {
							item.warn('OUT OF DATE')
							statuses.push('out-of-date')
						} else {
							item.done('UP TO DATE')
							statuses.push('up-to-date')
						}
					})
				)

				doneLoading('Done loading stack information')
				debug('Done loading data for all deployed stacks on AWS')

				if (statuses.includes('non-existent') || statuses.includes('out-of-date')) {
					write(dialog('warning', ['Your app has undeployed changes !!!']))
				} else {
					write(dialog('success', ['Your app has not been changed']))
				}
			})
		})
}
