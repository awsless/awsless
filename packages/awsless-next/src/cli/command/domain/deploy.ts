import { log } from '@clack/prompts'
import { Command } from 'commander'
import { createApp } from '../../../app.js'
import { getAccountId, getCredentials } from '../../../util/aws.js'
import { createWorkSpace } from '../../../util/workspace.js'
import { bootstrapAwsless } from '../../ui/complex/bootstrap-awsless.js'
import { layout } from '../../ui/complex/layout.js'
import { color, icon } from '../../ui/style.js'
import { task } from '../../ui/util.js'

export const deploy = (program: Command) => {
	program
		.command('deploy')
		.description('Deploy the domain zones to AWS')
		.action(async () => {
			await layout('domain deploy', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = getCredentials(profile)
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
					profile,
					region,
				})

				await task('Deploying the domain zones to AWS', async update => {
					await workspace.deploy(app, { filters: ['zones'] })

					update('Done deploying the domain zones to AWS.')
				})

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
