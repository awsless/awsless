import { Command } from "commander";
import { toApp } from "../../app";
import { debug, debugError } from "../logger";
import { bootstrapDeployer } from "../ui/complex/bootstrap";
import { layout } from "../ui/layout/layout";
import { br } from "../ui/layout/basic";
import { loadingDialog } from "../ui/layout/dialog";
import { confirmPrompt } from "../ui/prompt/confirm";
import { style } from "../style";
import { Cancelled } from "../error";
import { StackClient } from "../../stack/client";
import { stackTree } from "../ui/complex/stack-tree";
import { createDeploymentLine } from "../../util/deployment";
import { Signal } from "../lib/signal";

export const deploy = (program: Command) => {
	program
		.command('deploy')
		.argument('[stacks...]', 'Optionally filter stacks to deploy')
		.description('Deploy your app to AWS')
		.action(async (filters: string[]) => {
			await layout(async (config, write) => {

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

				const doneBuilding = write(loadingDialog('Building stack assets...'))

				await Promise.all(assets.map(async (_, assets) => {
					await Promise.all(assets.map(async (asset) => {
						await asset.build?.()
					}))
				}))

				doneBuilding('Done building stack assets')

				// ---------------------------------------------------
				// Publishing stack assets

				const donePublishing = write(loadingDialog('Publishing stack assets to AWS...'))

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

				write(br())
				write(stackTree(dependencyTree, statuses))

				const client = new StackClient(config)
				const deploymentLine = createDeploymentLine(dependencyTree)

				// debug('TEST', deploymentLine.map(stacks => stacks.length))

				for(const stacks of deploymentLine) {
					await Promise.allSettled(stacks.map(async stack => {
						const stackArtifect = assembly.stacks.find((item) => item.id === stack.artifactId)!
						statuses[stack.artifactId].set(style.warning('deploying'))

						try {
							await client.deploy(stackArtifect)
						} catch(error) {
							debugError(error)
							statuses[stack.artifactId].set(style.error('failed'))
							throw error
						}

						statuses[stack.artifactId].set(style.success('deployed'))
					}))
				}

				doneDeploying('Done deploying stacks to AWS')
			})
		})
}
