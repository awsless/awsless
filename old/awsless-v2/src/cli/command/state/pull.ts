import { Command } from 'commander'
import { createApp } from '../../../app.js'
import { getAccountId, getCredentials } from '../../../util/aws.js'
import { createWorkSpace, pullRemoteState } from '../../../util/workspace.js'
import { layout } from '../../ui/complex/layout.js'

export const pull = (program: Command) => {
	program
		.command('pull')
		.description('Pull the remote state and store it locally')
		.action(async () => {
			await layout('state pull', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const credentials = getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)

				const { app } = createApp({ appConfig, stackConfigs, accountId })
				const { stateProvider } = createWorkSpace({ credentials, region, accountId })

				await pullRemoteState(app, stateProvider)

				return 'State pull was successful.'
			})
		})
}
