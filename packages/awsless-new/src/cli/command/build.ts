import { Command } from 'commander'
import { createApp } from '../../app.js'
import { buildAssets } from '../ui/complex/build-assets.js'
import { layout } from '../ui/complex/layout.js'
import { getAccountId, getCredentials } from '../../util/aws.js'

export const build = (program: Command) => {
	program
		.command('build')
		.argument('[stack...]', 'Optionally filter stacks to build')
		.description('Build your app assets')
		.action(async (filters: string[]) => {
			await layout('build', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const credentials = getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)

				const { builders } = createApp({ appConfig, stackConfigs, accountId }, filters)

				await buildAssets(builders, true)

				return 'Build was successful.'
			})

			// await layout(async (config, write) => {

			// 	// await cleanUp()
			// 	// await write(typesGenerator(config))
			// 	// await write(assetBuilder(app))
			// 	// await write(templateBuilder(app))
			// })
		})
}
