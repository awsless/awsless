import { log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { Cancelled } from '../../../error.js'
import { getCredentials } from '../../../util/aws.js'
import { SsmStore } from '../../../util/ssm.js'
import { layout } from '../../ui/complex/layout.js'
import { color } from '../../ui/style.js'

export const del = (program: Command) => {
	program
		.command('delete <name>')
		.description('Delete a config value')
		.action(async (name: string) => {
			await layout('config delete', async ({ appConfig }) => {
				const credentials = getCredentials(appConfig.profile)
				const params = new SsmStore({
					credentials,
					appConfig,
				})

				const ok = await prompt.confirm({
					message: `Your deleting the ${color.info(name)} config parameter. Are you sure?`,
					initialValue: false,
				})

				if (!ok) {
					throw new Cancelled()
				}

				await log.task({
					initialMessage: 'Deleting remote config parameter...',
					successMessage: 'Done deleting remote config parameter.',
					errorMessage: 'Failed deleting remote config parameter.',
					async task() {
						await params.delete(name)
					},
				})
			})
		})
}
