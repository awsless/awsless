import { Command } from "commander";
import { toApp } from '../../app.js';
import { debug, debugError } from '../logger.js';
import { bootstrapDeployer } from '../ui/complex/bootstrap.js';
import { layout } from '../ui/layout/layout.js';
import { br } from '../ui/layout/basic.js';
import { loadingDialog } from '../ui/layout/dialog.js';
import { confirmPrompt } from '../ui/prompt/confirm.js';
import { style } from '../style.js';
import { Cancelled } from '../error.js';
import { StackClient } from '../../stack/client.js';
import { stackTree } from '../ui/complex/stack-tree.js';
import { createDeploymentLine } from '../../util/deployment.js';
import { Signal } from '../lib/signal.js';
import { assetBuilder } from "../ui/complex/asset.js";
import { cleanUp } from "../../util/cleanup.js";

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

				// const tasks = new Tasks()
				const { app, stackNames, assets, dependencyTree } = await toApp(config, filters)

				const formattedFilter = stackNames.map(i => style.info(i)).join(style.placeholder(', '))
				debug('Stacks to deploy', formattedFilter)

				const deployAll = filters.length === 0
				const deploySingle = filters.length === 1
				const confirm = await write(confirmPrompt((
					deployAll
					? `Are you sure you want to deploy ${style.warning('all')} stacks?`
					: deploySingle
					? `Are you sure you want to deploy the ${formattedFilter} stack?`
					: `Are you sure you want to deploy the [ ${formattedFilter} ] stacks?`
				)))

				if(!confirm) {
					throw new Cancelled()
				}

				// ---------------------------------------------------
				// Building stack assets

				await cleanUp()
				await write(assetBuilder(assets))

				// term.out.gap()
				// term.out.gap()

				// ---------------------------------------------------
				// Publishing stack assets

				// term.out.gap()

				const donePublishing = write(loadingDialog('Publishing stack assets to AWS...'))

				// term.out.gap()

				await Promise.all(assets.map(async (_, assets) => {
					await Promise.all(assets.map(async (asset) => {
						await asset.publish?.()
					}))
				}))

				donePublishing('Done publishing stack assets to AWS')

				// ---------------------------------------------------

				const assembly = app.synth()
				const statuses:Record<string, Signal<string>> = {}

				assembly.stacks.map((stack) => {
					statuses[stack.id] = new Signal(style.info('waiting'))
				})

				const doneDeploying = write(loadingDialog('Deploying stacks to AWS...'))

				write(stackTree(dependencyTree, statuses))

				const client = new StackClient(config)
				const deploymentLine = createDeploymentLine(dependencyTree)

				// debug('TEST', deploymentLine.map(stacks => stacks.length))

				for(const stacks of deploymentLine) {
					const results = await Promise.allSettled(stacks.map(async stack => {
						const signal = statuses[stack.artifactId]
						const stackArtifect = assembly.stacks.find((item) => item.id === stack.artifactId)!
						signal.set(style.warning('deploying'))

						try {
							await client.deploy(stackArtifect)
						} catch(error) {
							debugError(error)
							signal.set(style.error('failed'))
							throw error
						}

						signal.set(style.success('deployed'))
					}))

					for(const result of results) {
						if(result.status === 'rejected') {
							throw result.reason
						}
					}
				}

				doneDeploying('Done deploying stacks to AWS')
			})
		})
}
