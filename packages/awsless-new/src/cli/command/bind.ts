import { Command } from 'commander'
import { spawn } from 'child_process'
import { paramCase } from 'change-case'
import { GetFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda'

export const bind = (program: Command) => {
	program
		.command('bind')
		.argument('stack', 'The stack name')
		.argument('site', 'The site name')
		.argument('<command...>', 'The command to execute')
		.description(`Bind your site environment variables to a command`)
		.action(async (stack: string, site: string, commands: string[]) => {
			await layout(async (config, write) => {
				const command = commands.join(' ')

				// Get stack config
				const stackConfig = config.stacks.find(s => s.name === stack)
				if (!stackConfig) {
					throw new Error(`[${stack}] Stack doesn't exist.`)
				}

				// Get site config
				const siteConfig = stackConfig.sites?.[site]
				if (!siteConfig) {
					throw new Error(`[${site}] Site doesn't exist.`)
				}

				// Get the site SSR env vars
				let functionEnv: Record<string, string> = {}

				if (siteConfig.ssr) {
					const client = new LambdaClient({
						credentials: config.credentials,
						region: config.app.region,
					})

					const lambdaLoader = write(loadingDialog('Loading SSR lambda environment variables...'))

					try {
						const result = await client.send(
							new GetFunctionCommand({
								FunctionName: paramCase(`${config.app.name}-${stack}-site-${site}`),
							})
						)

						functionEnv = result.Configuration?.Environment?.Variables ?? {}
					} catch (error) {
						if (error instanceof Error && error.message.includes('not found')) {
							// Chicken egg problem.
							write(dialog('warning', [`The SSR lambda hasn't been deployed yet.`]))
						} else {
							throw error
						}
					} finally {
						lambdaLoader('Done loading SSR lambda environment variables')
					}
				}

				// Load AWS credentials...
				const credentialsLoader = write(loadingDialog('Loading AWS credentials...'))
				const credentials = await config.credentials()
				credentialsLoader('Done loading AWS credentials')

				spawn(command, {
					env: {
						// Pass the process env vars
						...process.env,

						// Pass the lambda env vars
						...functionEnv,

						// Basic info
						AWS_REGION: config.app.region,
						AWS_ACCOUNT_ID: config.account,

						// Give AWS access
						AWS_ACCESS_KEY_ID: credentials.accessKeyId,
						AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
						AWS_SESSION_TOKEN: credentials.sessionToken,
					},
					stdio: 'inherit',
					shell: true,
				})
			})
		})
}
