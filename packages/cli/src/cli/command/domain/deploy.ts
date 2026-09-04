import { log } from '@awsless/clui'
import { Command } from 'commander'
import { createApp } from '../../../app.js'
import { createWorkSpace } from '../../../util/workspace.js'
import { bootstrapAwsless } from '../../ui/complex/bootstrap-awsless.js'
import { layout } from '../../ui/complex/layout.js'
import { createClients } from '../util.js'
import { logDomainZones } from './util.js'

export const deploy = (program: Command) => {
	program
		.command('deploy')
		.description('Deploy the domain zones to AWS')
		.action(async () => {
			await layout('domain deploy', async ({ appConfig, stackConfigs }) => {
				const { region, credentials, accountId } = await createClients(appConfig)

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

				await log.task({
					initialMessage: 'Deploying the domain zones to AWS...',
					successMessage: 'Done deploying the domain zones to AWS.',
					errorMessage: 'Failed deploying the domain zones to AWS.',
					async task() {
						await workspace.deploy(app, { filters: ['zones'] })
					},
				})

				await logDomainZones(domainZones)
			})
		})
}
