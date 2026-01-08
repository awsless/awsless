import { confirm, isCancel } from '@clack/prompts'
import { Command } from 'commander'
import { createApp } from '../../../app.js'
import { Cancelled } from '../../../error.js'
import { getAccountId, getCredentials } from '../../../util/aws.js'
import { layout } from '../../ui/complex/layout.js'

export const importTable = (program: Command) => {
	program
		.command('import')
		.description('Import a local json file into a specific table')
		.action(async () => {
			await layout('table import', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const credentials = await getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)

				const { app } = createApp({ appConfig, stackConfigs, accountId })

				const ok = await confirm({
					message: 'Importing your local json file will replace the remote data. Are you sure?',
					initialValue: false,
				})

				if (!ok || isCancel(ok)) {
					throw new Cancelled()
				}

				// await pushRemoteState(app, stateProvider)

				return 'State push was successful.'
			})
		})
}
