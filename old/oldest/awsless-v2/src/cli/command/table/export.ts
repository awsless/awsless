import { confirm, isCancel } from '@clack/prompts'
import { Command } from 'commander'
import { createApp } from '../../../app.js'
import { Cancelled } from '../../../error.js'
import { getAccountId, getCredentials } from '../../../util/aws.js'
import { createWorkSpace, pushRemoteState } from '../../../util/workspace.js'
import { layout } from '../../ui/complex/layout.js'

export const exportTable = (program: Command) => {
	program
		.command('export')
		.description('Export a specific table to a local json file')
		.action(async () => {
			await layout('table export', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const credentials = getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)

				const { app } = createApp({ appConfig, stackConfigs, accountId })

				// const ok = await confirm({
				// 	message: 'Importing your local json file will replace the remote data. Are you sure?',
				// 	initialValue: false,
				// })

				// if (!ok || isCancel(ok)) {
				// 	throw new Cancelled()
				// }

				// await pushRemoteState(app, stateProvider)

				return 'State push was successful.'
			})
		})
}
