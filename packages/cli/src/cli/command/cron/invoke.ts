import { log, prompt } from '@awsless/clui'
import { invoke as invokeLambda, LambdaClient } from '@awsless/lambda'
import { formatRoutePayload } from 'awsless'
import { Command } from 'commander'
import { ExpectedError } from '../../../error.js'
import { formatRouteKey } from '../../../feature/bundle/util.js'
import { getCredentials } from '../../../util/aws.js'
import { getBundleFunctionName } from '../../../util/name.js'
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

					if (process.env.SKIP_PROMPT) {
						throw new ExpectedError(
							`Pass the stack argument when running with --skip-prompt: [ ${cronStacks
								.map(stack => stack.name)
								.join(', ')} ]`
						)
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

				if (names.length === 0) {
					throw new ExpectedError(`No crons are defined in stack "${stack}".`)
				}

				if (!name) {
					if (process.env.SKIP_PROMPT) {
						throw new ExpectedError(
							`Pass the cron name argument when running with --skip-prompt: [ ${names.join(', ')} ]`
						)
					}

					name = await prompt.select({
						message: 'Select the cron:',
						options: names.map(name => ({
							label: name,
							value: name,
						})),
					})
				}

				if (!names.includes(name)) {
					throw new ExpectedError(`The cron "${name}" doesn't exist in stack "${stack}".`)
				}

				// ------------------------------------------------
				// Get the cron

				const functionName = getBundleFunctionName(appConfig.name)

				const payload = stackConfig.crons?.[name]?.payload ?? {}
				const routeKey = formatRouteKey(stackConfig.name, 'cron', name)

				const response = await log.task({
					initialMessage: 'Invoking cron...',
					successMessage: 'Done invoking cron.',
					errorMessage: 'Failed invoking cron.',
					task() {
						return invokeLambda({
							name: functionName,
							qualifier: 'live',
							payload: formatRoutePayload(routeKey, payload),
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
