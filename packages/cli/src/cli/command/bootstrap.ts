import { Command } from 'commander'
import { bootstrapAwsless } from '../ui/complex/bootstrap-awsless.js'
import { layout } from '../ui/complex/layout.js'
import { createClients } from './util.js'

export const bootstrap = (program: Command) => {
	program
		.command('bootstrap')
		.description('Create the awsless bootstrap stack')
		.action(async () => {
			await layout('bootstrap', async ({ appConfig }) => {
				const { credentials, accountId } = await createClients(appConfig)

				await bootstrapAwsless({
					credentials,
					region: appConfig.region,
					accountId,
				})

				return 'Ready to go!'
			})
		})
}
