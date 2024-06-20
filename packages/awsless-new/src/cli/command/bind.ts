import { unwrap } from '@awsless/formation'
import { note } from '@clack/prompts'
import { spawn } from 'child_process'
import { Command } from 'commander'
import { createApp } from '../../app.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { createWorkSpace } from '../../util/workspace.js'
import { layout } from '../ui/complex/layout.js'
import { list, wrap } from '../ui/util.js'

export const bind = (program: Command) => {
	program
		.command('bind')
		// .argument('stack', 'The stack name')
		// .argument('site', 'The site name')
		.argument('<command...>', 'The command to execute')
		.description(`Bind your site environment variables to a command`)
		// .action(async (stack: string, site: string, commands: string[]) => {
		.action(async (commands: string[]) => {
			await layout('bind', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const credentials = getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)

				const { app, binds } = createApp({ appConfig, stackConfigs, accountId })

				const { workspace } = createWorkSpace({
					credentials,
					accountId,
					region,
				})

				await workspace.hydrate(app)

				const env: Record<string, string> = {}
				for (const { name, value } of binds) {
					env[name] = unwrap(value)
				}

				note(wrap(list(env)), 'Bind Env')

				if (commands.length === 0) {
					return
				}

				const command = commands.join(' ')

				spawn(command, {
					env: {
						// Pass the process env vars
						...process.env,

						// Pass the site bind env vars
						...env,

						// Basic info
						AWS_REGION: appConfig.region,
						AWS_ACCOUNT_ID: accountId,

						// Give AWS access

						// AWS_ACCESS_KEY_ID: credentials.accessKeyId,
						// AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
						// AWS_SESSION_TOKEN: credentials.sessionToken,
					},
					stdio: 'inherit',
					shell: true,
				})

				// Get stack config
				// const stackConfig = config.stacks.find(s => s.name === stack)
				// if (!stackConfig) {
				// 	throw new Error(`[${stack}] Stack doesn't exist.`)
				// }

				// // Get site config
				// const siteConfig = stackConfig.sites?.[site]
				// if (!siteConfig) {
				// 	throw new Error(`[${site}] Site doesn't exist.`)
				// }
			})
		})
}
