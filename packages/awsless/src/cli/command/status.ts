import { Command } from "commander";
import { toApp } from "../../app.js";
import { StackClient } from "../../formation/client.js";
import { debug } from "../logger.js";
import { stackTree } from "../ui/complex/stack-tree.js";
import { style } from "../style.js";
import { layout } from "../ui/layout/layout.js";
import { Signal } from "../lib/signal.js";
import { assetBuilder } from "../ui/complex/builder.js";
import { cleanUp } from "../../util/cleanup.js";
import { dialog, loadingDialog } from "../ui/layout/dialog.js";
import { templateBuilder } from "../ui/complex/template.js";

export const status = (program: Command) => {
	program
		.command('status')
		.argument('[stacks...]', 'Optionally filter stacks to lookup status')
		.description('View the application status')
		.action(async (filters: string[]) => {
			await layout(async (config, write) => {
				const { app, dependencyTree } = await toApp(config, filters)

				// --------------------------------------------------------
				// Build stack assets

				await cleanUp()
				await write(assetBuilder(app))
				await write(templateBuilder(app))

				// --------------------------------------------------------
				// Get stack statuses

				const doneLoading = write(loadingDialog('Loading stack information...'))

				const client = new StackClient(app, config.account, config.region, config.credentials)
				const statuses: Array<'non-existent' | 'out-of-date' | 'up-to-date'> = []
				const stackStatuses: Record<string, Signal<string>> = {}

				for(const stack of app) {
					stackStatuses[stack.name] = new Signal(style.info('Loading...'))
				}

				// render the stacks with a loading state
				write(stackTree(dependencyTree, stackStatuses))

				debug('Load metadata for all deployed stacks on AWS')

				await Promise.all(app.stacks.map(async (stack, i) => {
					const info = await client.get(stack.name, stack.region)
					const signal = stackStatuses[stack.name]

					await new Promise(resolve => setTimeout(resolve, i * 1000))

					if(!info) {
						signal.set(style.error('non-existent'))
						statuses.push('non-existent')
					}
					else if(info.template !== stack.toString()) {
						signal.set(style.warning('out-of-date'))
						statuses.push('out-of-date')
					} else {
						signal.set(style.success('up-to-date'))
						statuses.push('up-to-date')
					}
				}))

				doneLoading('Done loading stack information')
				debug('Done loading data for all deployed stacks on AWS')

				if(statuses.includes('non-existent') || statuses.includes('out-of-date')) {
					write(dialog('warning', [ 'Your app has undeployed changes !!!' ]))
				} else {
					write(dialog('success', [ 'Your app has not been changed' ]))
				}
			})
		})
}
