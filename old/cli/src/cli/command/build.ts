import { Command } from 'commander'
import { createApp } from '../../app.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { buildAssets } from '../ui/complex/build-assets.js'
import { layout } from '../ui/complex/layout.js'

export const build = (program: Command) => {
	program
		.command('build')
		.argument('[stack...]', 'Optionally filter stacks to build')
		.description('Build your app assets')
		.action(async (filters: string[]) => {
			await layout('build', async ({ appConfig, stackConfigs }) => {
				const credentials = await getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, appConfig.region)

				const { builders } = createApp({ appConfig, stackConfigs, accountId })

				await buildAssets(builders, filters, true)

				return 'Build was successful.'
			})
		})
}
