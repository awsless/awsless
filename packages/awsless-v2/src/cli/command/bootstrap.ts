import { Command } from 'commander'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { bootstrapAwsless } from '../ui/complex/bootstrap-awsless.js'
import { layout } from '../ui/complex/layout.js'

export const bootstrap = (program: Command) => {
	program
		.command('bootstrap')
		.description('Create the awsless bootstrap stack')
		.action(async () => {
			await layout('bootstrap', async ({ appConfig }) => {
				const credentials = getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, appConfig.region)

				await bootstrapAwsless({
					credentials,
					region: appConfig.region,
					accountId,
				})

				return 'Ready to go!'
			})
		})
}
