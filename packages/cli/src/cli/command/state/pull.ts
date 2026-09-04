import { Command } from 'commander'
import { createApp } from '../../../app.js'
import { createWorkSpace, pullRemoteState } from '../../../util/workspace.js'
import { layout } from '../../ui/complex/layout.js'
import { createClients } from '../util.js'

export const pull = (program: Command) => {
	program
		.command('pull')
		.description('Pull the remote state and store it locally')
		.action(async () => {
			await layout('state pull', async ({ appConfig, stackConfigs }) => {
				const { region, credentials, accountId } = await createClients(appConfig)

				const { app } = createApp({ appConfig, stackConfigs, accountId })
				const { state } = await createWorkSpace({ credentials, region, accountId })

				await pullRemoteState(app, state)

				return 'State pull was successful.'
			})
		})
}
