import { Command } from 'commander'
import { createApp } from '../../app.js'
import { debug, debugError } from '../debug.js'
import { layout } from '../ui/complex/layout.js'
import { color } from '../ui/style.js'
import { Cancelled } from '../../error.js'
import { confirm, spinner } from '@clack/prompts'
import { getCredentials } from '../../util/aws.js'
import { WorkSpace, aws } from '@awsless/formation'

export const del = (program: Command) => {
	program
		.command('delete')
		.argument('[stacks...]', 'Optionally filter stacks to delete')
		.description('Delete your app from AWS')
		.action(async (filters: string[]) => {
			await layout('delete', async ({ appConfig, stackConfigs }) => {
				const credentials = getCredentials(appConfig.profile)
				const region = appConfig.region

				// ---------------------------------------------------

				const { app } = createApp({ appConfig, stackConfigs }, filters)

				// const deletingLine = deploymentLine.reverse()
				const stackNames = [...app.stacks].map(stack => stack.name)
				const formattedFilter = stackNames.map(i => color.info(i)).join(color.dim(', '))

				debug('Stacks to delete', formattedFilter)

				if (!process.env.SKIP_PROMPT) {
					const deployAll = filters.length === 0
					const deploySingle = filters.length === 1
					const ok = await confirm({
						message: deployAll
							? `Are you sure you want to ${color.error('delete')} ${color.warning('all')} stacks?`
							: deploySingle
							? `Are you sure you want to ${color.error('delete')} the ${formattedFilter} stack?`
							: `Are you sure you want to ${color.error(
									'delete'
							  )} the [ ${formattedFilter} ] stacks?`,
					})

					if (!ok) {
						throw new Cancelled()
					}
				}

				// ---------------------------------------------------

				const workspace = new WorkSpace({
					stateProvider: new aws.dynamodb.DynamoDBStateProvider({
						credentials,
						region,
						tableName: 'awsless-state',
					}),
					cloudProviders: aws.createCloudProviders({
						credentials,
						region: appConfig.region,
					}),
				})

				// const spin = spinner()
				// spin.start('Deleting stacks from AWS')

				for (const stack of app.stacks) {
					const spin = spinner()
					spin.start(`Deleting the ${color.info(stack.name)} stack from AWS`)

					try {
						await workspace.deleteStack(stack)
					} catch (error) {
						debugError(error)
						spin.stop('Failed.', 2)
						throw error
					}

					spin.stop(`Done deleting the ${color.info(stack.name)} stack from AWS`)
				}

				// spin.stop('Done deleting stacks from AWS.')

				// const doneDeploying = write(loadingDialog('Deleting stacks from AWS...'))

				// const client = new StackClient(app, config.account, config.app.region, config.credentials)

				// term.out.gap()

				// for (const stacks of deletingLine) {
				// 	await write(
				// 		runTaskGroup(
				// 			5,
				// 			stacks.map(stack => ({
				// 				label: stack.name,
				// 				task: async update => {
				// 					update('deleting...')

				// 					await client.delete(stack.name, stack.region)

				// 					// try {
				// 					// 	await client.delete(stack.name, stack.region)
				// 					// } catch (error) {
				// 					// 	debugError(error)
				// 					// 	update('failed')
				// 					// 	throw error
				// 					// }

				// 					update('deleted')
				// 					return 'done'
				// 				},
				// 			}))
				// 		)
				// 	)
				// }

				// term.out.gap()

				// doneDeploying('Done deleting stacks from AWS')
			})
		})
}
