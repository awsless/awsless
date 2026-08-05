import { log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { createApp } from '../../../app.js'
import { ExpectedError } from '../../../error.js'
import { getAccountId, getCredentials } from '../../../util/aws.js'
import { restartLambdaFunctions } from '../../../util/lambda.js'
import { SsmStore } from '../../../util/ssm.js'
import { createWorkSpace } from '../../../util/workspace.js'
import { layout } from '../../ui/complex/layout.js'

export const set = (program: Command) => {
	program
		.command('set <name>')
		.description('Set a config value')
		.option('--value <value>', 'The config value, skips the interactive prompt')
		.option('--no-restart', `Don't restart active functions that use this config`)
		// .option('-e --encrypt', 'Encrypt the config value')
		.action(async (name: string, options: { value?: string; restart: boolean }) => {
			await layout('config set', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				const { functionsByConfig, app } = createApp({ appConfig, stackConfigs, accountId })

				const { workspace } = await createWorkSpace({
					credentials,
					accountId,
					region,
				})

				const params = new SsmStore({
					credentials,
					appConfig,
				})

				// console.log(functionsByConfig)

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
							if (value.trim() === '') {
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

				// The restart flag defaults to true, so only an interactive
				// run without an explicit no-restart flag prompts.
				let restart = options.restart

				if (restart && !process.env.SKIP_PROMPT) {
					restart = await prompt.confirm({
						message: 'Want to restart active functions that are using this config?',
						initialValue: true,
					})
				}

				if (restart) {
					await log.task({
						initialMessage: 'Restarting functions...',
						successMessage: 'Done restarting functions.',
						errorMessage: 'Failed restarting functions.',
						async task() {
							const functions = functionsByConfig[name]

							if (functions && functions.length > 0) {
								await workspace.hydrate(app)

								const entries = await Promise.all(
									(functions ?? []).map(async lambda => ({
										functionName: await lambda.functionName,
										s3: {
											bucket: (await lambda.s3Bucket)!,
											key: (await lambda.s3Key)!,
											version: await lambda.s3ObjectVersion,
										},
									}))
								)

								await restartLambdaFunctions({
									credentials,
									region,
									functions: entries,
								})
							}
						},
					})
				}

				// const spin = spinner()
				// spin.start('Saving remote config parameter')
				// await params.set(name, value)
				// spin.stop(`Done saving remote config parameter.`)
			})
		})
}
