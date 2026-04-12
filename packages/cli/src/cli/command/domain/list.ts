import { log } from '@awsless/clui'
import { Command } from 'commander'
import { createApp } from '../../../app.js'
import { getAccountId, getCredentials } from '../../../util/aws.js'
import { createWorkSpace } from '../../../util/workspace.js'
import { bootstrapAwsless } from '../../ui/complex/bootstrap-awsless.js'
import { layout } from '../../ui/complex/layout.js'
import { color, icon } from '../../ui/style.js'

export const list = (program: Command) => {
	program
		.command('list')
		.description('List all domains')
		.action(async () => {
			await layout('domain list', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				// ---------------------------------------------------
				// deploy the bootstrap first...

				await bootstrapAwsless({ credentials, region, accountId })

				// ---------------------------------------------------

				const { app, domainZones } = createApp({
					appConfig,
					stackConfigs,
					accountId,
				})

				// ---------------------------------------------------

				const { workspace } = await createWorkSpace({
					credentials,
					accountId,
					region,
				})

				await workspace.hydrate(app)

				for (const zone of domainZones) {
					log.step(
						[
							//
							color.label.green(await zone.name),
							color.dim(icon.arrow.right),
							color.dim(await zone.id),
						].join(' ')
					)

					log.message((await zone.nameServers).join('\n'))
				}
			})
		})
}
