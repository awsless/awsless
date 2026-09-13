import { Command } from 'commander'
import { createApp } from '../../../app.js'
import { createWorkSpace } from '../../../util/workspace.js'
import { layout } from '../../ui/complex/layout.js'
import { createClients } from '../util.js'
import { logDomainZones } from './util.js'

export const list = (program: Command) => {
	program
		.command('list')
		.description('List all domains')
		.action(async () => {
			await layout('domain list', async ({ appConfig, stackConfigs }) => {
				const { region, credentials, accountId } = await createClients(appConfig)

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

				await logDomainZones(domainZones)
			})
		})
}
