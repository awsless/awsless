import { confirm } from '@clack/prompts'
import { Command } from 'commander'
import { createApp } from '../../app.js'
import { Cancelled } from '../../error.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { createWorkSpace, pullRemoteState } from '../../util/workspace.js'
import { debug } from '../debug.js'
import { layout } from '../ui/complex/layout.js'
import { color } from '../ui/style.js'
import { task } from '../ui/util.js'

export const del = (program: Command) => {
	program
		.command('delete')
		.argument('[stacks...]', 'Optionally filter stacks to delete')
		.description('Delete your app from AWS')
		.action(async (filters: string[]) => {
			await layout('delete', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const credentials = getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)

				// ---------------------------------------------------

				const { app } = createApp({ appConfig, stackConfigs, accountId }, filters)

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

				const { workspace, stateProvider } = createWorkSpace({
					credentials,
					accountId,
					region,
				})

				await task('Deleting the stacks to AWS', async update => {
					await workspace.deleteApp(app)
					await pullRemoteState(app, stateProvider)

					update('Done deleting the stacks to AWS.')
				})

				return 'Your app has been deleted!'
			})
		})
}
