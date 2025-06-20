import { log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { getCredentials } from '../../../util/aws.js'
import { SsmStore } from '../../../util/ssm.js'
import { layout } from '../../ui/complex/layout.js'

export const set = (program: Command) => {
	program
		.command('set <name>')
		.description('Set a config value')
		// .option('-e --encrypt', 'Encrypt the config value')
		.action(async (name: string) => {
			await layout('config set', async ({ appConfig }) => {
				const credentials = getCredentials(appConfig.profile)
				const params = new SsmStore({
					credentials,
					appConfig,
				})

				const initialValue = await params.get(name)

				const value = await prompt.text({
					message: 'Enter the config value:',
					initialValue,
					validate(value) {
						if (value === '') {
							return `Value can't be empty`
						}

						return
					},
				})

				await log.task({
					initialMessage: 'Saving remote config parameter...',
					successMessage: 'Done saving remote config parameter.',
					errorMessage: 'Failed saving remote config parameter.',
					async task() {
						await params.set(name, value)
					},
				})

				// const spin = spinner()
				// spin.start('Saving remote config parameter')
				// await params.set(name, value)
				// spin.stop(`Done saving remote config parameter.`)
			})
		})
}
