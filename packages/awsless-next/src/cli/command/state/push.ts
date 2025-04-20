import { confirm, isCancel } from '@clack/prompts'
import { Command } from 'commander'
import { createApp } from '../../../app.js'
import { Cancelled } from '../../../error.js'
import { getAccountId, getCredentials } from '../../../util/aws.js'
import { createWorkSpace, pushRemoteState } from '../../../util/workspace.js'
import { layout } from '../../ui/complex/layout.js'

export const push = (program: Command) => {
	program
		.command('push')
		.description('Push the local state to the remote server')
		.action(async () => {
			await layout('state pull', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)

				const { app } = createApp({ appConfig, stackConfigs, accountId })
				const { state } = await createWorkSpace({ credentials, region, accountId, profile })

				const ok = await confirm({
					message: 'Pushing up the local state might corrupt your remote state. Are you sure?',
					initialValue: false,
				})

				if (!ok || isCancel(ok)) {
					throw new Cancelled()
				}

				await pushRemoteState(app, state)

				return 'State push was successful.'
			})
		})
}
