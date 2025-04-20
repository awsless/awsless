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
				const profile = appConfig.profile
				const credentials = getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				const { app } = createApp({ appConfig, stackConfigs, accountId })
				const { state } = await createWorkSpace({ credentials, region, accountId, profile })

				await pullRemoteState(app, state)

				return 'State pull was successful.'
			})
		})
}
