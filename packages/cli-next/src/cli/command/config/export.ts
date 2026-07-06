import { log } from '@awsless/clui'
import { Command } from 'commander'
import { getCredentials } from '../../../util/aws.js'
import { SsmStore } from '../../../util/ssm.js'
import { layout } from '../../ui/complex/layout.js'

export const export_ = (program: Command) => {
	program
		.command('export')
		.description('Export all config values')
		.action(async () => {
			await layout('export', async ({ appConfig }) => {
				const credentials = await getCredentials(appConfig.profile)
				const params = new SsmStore({
					credentials,
					appConfig,
				})

				const values = await log.task({
					initialMessage: 'Exporting config parameters...',
					successMessage: 'Done exporting config values.',
					errorMessage: 'Failed exporting config values.',
					task() {
						return params.list()
					},
				})

				console.log('')
				console.log(JSON.stringify(values))
				console.log('')
				process.exit()

				// return '\n\n' + JSON.stringify(values)
			})
		})
}
