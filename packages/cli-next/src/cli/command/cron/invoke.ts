import { log, prompt } from '@awsless/clui'
import { invoke as invokeLambda, LambdaClient } from '@awsless/lambda'
import { Command } from 'commander'
import { ExpectedError } from '../../../error.js'
import { getCredentials } from '../../../util/aws.js'
import { formatLocalResourceName } from '../../../util/name.js'
import { layout } from '../../ui/complex/layout.js'

export const invoke = (program: Command) => {
	program
		.command('invoke')
		.description('Invoke a cronjob')
		.argument('[stack]', 'The stack name of the cronjob')
		.argument('[name]', 'The name of the cronjob')
		// .option('-e --encrypt', 'Encrypt the config value')
		.action(async (stack?: string, name?: string) => {
			await layout('cron invoke', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)

				if (!stack) {
					const cronStacks = stackConfigs.filter(stack => {
						if (Object.keys(stack.crons ?? {}).length > 0) {
							return stack
						}
						return
					})

					if (cronStacks.length === 0) {
						throw new ExpectedError('There are no crons defined inside your app.')
					}

					stack = await prompt.select({
						message: 'Select the stack:',
						options: cronStacks.map(stack => ({
							label: stack.name,
							value: stack.name,
						})),
					})
				}

				const stackConfig = stackConfigs.find(s => s.name === stack)

				if (!stackConfig) {
					throw new ExpectedError(`The stack "${stack}" doesn't exist.`)
				}

				const names = Object.keys(stackConfig.crons ?? {})

				if (!name) {
					name = await prompt.select({
						message: 'Select the cron:',
						options: names.map(name => ({
							label: name,
							value: name,
						})),
					})
				}

				if (!names) {
					throw new ExpectedError(`No image resources are defined in stack "${stack}".`)
				}

				// ------------------------------------------------
				// Get the cron

				const functionName = formatLocalResourceName({
					appName: appConfig.name,
					stackName: stackConfig.name,
					resourceType: 'cron',
					resourceName: name,
				})

				const payload = stackConfig.crons?.[name]?.payload ?? {}

				const response = await log.task({
					initialMessage: 'Invoking cron...',
					successMessage: 'Done invoking cron.',
					errorMessage: 'Failed invoking cron.',
					task() {
						return invokeLambda({
							name: functionName,
							payload,
							client: new LambdaClient({
								credentials,
								region,
							}),
						})
					},
				})

				log.note('Response', JSON.stringify(response, undefined, 4))

				// console.log(response)

				// const spin = spinner()
				// spin.start('Saving remote config parameter')
				// await params.set(name, value)
				// spin.stop(`Done saving remote config parameter.`)
			})
		})
}
