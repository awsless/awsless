import { log, prompt } from '@awsless/clui'
import { Command } from 'commander'
import { createApp } from '../../../app.js'
import { getAccountId, getCredentials } from '../../../util/aws.js'
import { restartLambdaFunctions } from '../../../util/lambda.js'
import { SsmStore } from '../../../util/ssm.js'
import { createWorkSpace } from '../../../util/workspace.js'
import { layout } from '../../ui/complex/layout.js'

export const set = (program: Command) => {
	program
		.command('set <name>')
		.description('Set a config value')
		// .option('-e --encrypt', 'Encrypt the config value')
		.action(async (name: string) => {
			await layout('config set', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				const { functionsByConfig, app } = createApp({ appConfig, stackConfigs, accountId })

				const { workspace } = await createWorkSpace({
					credentials,
					accountId,
					profile,
					region,
				})

				const params = new SsmStore({
					credentials,
					appConfig,
				})

				// console.log(functionsByConfig)

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

				const restart = await prompt.confirm({
					message: 'Want to restart active functions that are using this config?',
					initialValue: true,
				})

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
