import { Cancelled, log, prompt } from '@awsless/clui'
import { sleep } from 'bun'
import { Command } from 'commander'
import { getCredentials } from '../../../util/aws.js'
import { SsmStore } from '../../../util/ssm.js'
import { layout } from '../../ui/complex/layout.js'

export const import_ = (program: Command) => {
	program
		.command('import')
		.description('Import config values')
		.action(async () => {
			await layout('import', async ({ appConfig }) => {
				const credentials = await getCredentials(appConfig.profile)
				const params = new SsmStore({
					credentials,
					appConfig,
				})

				const json = await prompt.text({
					message: 'The config values in JSON format',
					validate: value => {
						try {
							JSON.parse(value)
						} catch {
							return 'Invalid JSON'
						}

						return
					},
				})

				const values = JSON.parse(json) as Record<string, string>

				log.table({
					head: ['Name', 'Value'],
					body: Object.entries(values),
				})

				const confirm = await prompt.confirm({
					message: 'Are you sure you want to import the config values?',
					initialValue: false,
				})

				if (!confirm) {
					throw new Cancelled()
				}

				await log.task({
					initialMessage: 'Importing config parameters...',
					successMessage: 'Done importing config values.',
					errorMessage: 'Failed importing config values.',
					async task() {
						for (const [name, value] of Object.entries(values)) {
							await params.set(name, value)
							await sleep(1000 / 2)
						}
					},
				})
			})
		})
}
