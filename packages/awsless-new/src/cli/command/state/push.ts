import { Command } from 'commander'
import { createApp } from '../../../app.js'
import { layout } from '../../ui/complex/layout.js'
import { getAccountId, getCredentials } from '../../../util/aws.js'
import { createWorkSpace, pushRemoteState } from '../../../util/workspace.js'
import { confirm } from '@clack/prompts'
import { Cancelled } from '../../../error.js'

export const push = (program: Command) => {
	program
		.command('push')
		.description('Push the local state to the remote server')
		.action(async () => {
			await layout('state pull', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const credentials = getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)

				const { app } = createApp({ appConfig, stackConfigs, accountId })
				const { stateProvider } = createWorkSpace({ credentials, region })

				const ok = await confirm({
					message: 'Pushing up the local state might corrupt your remote state. Are you sure?',
					initialValue: false,
				})

				if (!ok) {
					throw new Cancelled()
				}

				await pushRemoteState(app, stateProvider)

				return 'State push was successful.'
			})
		})
}