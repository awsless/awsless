import { Command } from "commander";
import { toApp } from '../../app.js';
import { debug, debugError } from '../logger.js';
import { layout } from '../ui/layout/layout.js';
import { loadingDialog } from '../ui/layout/dialog.js';
import { confirmPrompt } from '../ui/prompt/confirm.js';
import { style } from '../style.js';
import { Cancelled } from '../error.js';
import { StackClient } from '../../formation/client.js';
import { stacksDeployer } from '../ui/complex/deployer.js';

export const del = (program: Command) => {
	program
		.command('delete')
		.argument('[stacks...]', 'Optionally filter stacks to delete')
		.description('Delete your app from AWS')
		.action(async (filters: string[]) => {
			await layout(async (config, write) => {

				// ---------------------------------------------------

				const { app, deploymentLine } = await toApp(config, filters)

				const deletingLine = deploymentLine.reverse()
				const stackNames = app.stacks.map(stack => stack.name)
				const formattedFilter = stackNames.map(i => style.info(i)).join(style.placeholder(', '))
				debug('Stacks to delete', formattedFilter)

				if(!process.env.SKIP_PROMPT) {
					const deployAll = filters.length === 0
					const deploySingle = filters.length === 1
					const confirm = await write(confirmPrompt((
						deployAll
						? `Are you sure you want to ${ style.error('delete') } ${ style.warning('all') } stacks?`
						: deploySingle
						? `Are you sure you want to ${ style.error('delete') } the ${ formattedFilter } stack?`
						: `Are you sure you want to ${ style.error('delete') } the [ ${ formattedFilter } ] stacks?`
					)))

					if(!confirm) {
						throw new Cancelled()
					}
				}

				// ---------------------------------------------------

				const doneDeploying = write(loadingDialog('Deleting stacks from AWS...'))

				const client = new StackClient(app, config.account, config.region, config.credentials)

				const ui = write(stacksDeployer(deletingLine))

				for(const line of deletingLine) {
					const results = await Promise.allSettled(line.map(async stack => {
						const item = ui[stack.name]

						item.start('deleting')

						try {
							await client.delete(stack.name, stack.region)
						} catch(error) {
							debugError(error)
							item.fail('failed')
							throw error
						}

						item.done('deleted')
					}))

					for(const result of results) {
						if(result.status === 'rejected') {
							throw result.reason
						}
					}
				}

				doneDeploying('Done deleting stacks from AWS')
			})
		})
}
