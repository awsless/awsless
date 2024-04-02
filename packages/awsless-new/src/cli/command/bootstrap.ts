import { Command } from 'commander'
import { layout } from '../ui/complex/layout.js'
import { bootstrapAwsless } from '../ui/complex/bootstrap-awsless.js'
import { getCredentials } from '../../util/aws.js'

export const bootstrap = (program: Command) => {
	program
		.command('bootstrap')
		.description('Create the awsless bootstrap stack')
		.action(async () => {
			await layout('bootstrap', async ({ appConfig }) => {
				const credentials = getCredentials(appConfig.profile)

				await bootstrapAwsless({
					credentials,
					region: appConfig.region,
				})

				return 'Ready to go!'
			})
		})
}
