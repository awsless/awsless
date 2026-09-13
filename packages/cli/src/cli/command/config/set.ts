import { log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { ExpectedError } from '../../../error.js'
import { getCredentials } from '../../../util/aws.js'
import { SsmStore } from '../../../util/ssm.js'
import { layout } from '../../ui/complex/layout.js'

export const set = (program: Command) => {
	program
		.command('set <name>')
		.description('Set a config value')
		.option('--value <value>', 'The config value, skips the interactive prompt')
		.action(async (name: string, options: { value?: string }) => {
			await layout('config set', async ({ appConfig }) => {
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)

				const params = new SsmStore({
					credentials,
					appConfig,
				})

				let value = options.value

				if (typeof value === 'undefined') {
					if (process.env.SKIP_PROMPT) {
						throw new ExpectedError('Pass --value <value> when running with --skip-prompt.')
					}

					const initialValue = await params.get(name)

					value = await prompt.text({
						message: 'Enter the config value:',
						initialValue,
						validate(value) {
							if (!value || value.trim() === '') {
								return `Value can't be empty`
							}

							return
						},
					})
				}

				value = value.trim()

				if (value === '') {
					throw new ExpectedError(`Value can't be empty`)
				}

				await log.task({
					initialMessage: 'Saving remote config parameter...',
					successMessage: 'Done saving remote config parameter.',
					errorMessage: 'Failed saving remote config parameter.',
					async task() {
						await params.set(name, value)
					},
				})

				// Configs are fetched at cold start, so running functions keep
				// their old value until the next deploy recycles them.
				log.info('Deploy to roll the new value out to running functions.')
			})
		})
}
