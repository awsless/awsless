import { unwrap } from '@awsless/formation'
import { log, note } from '@clack/prompts'
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

		.argument('[command...]', 'The command to execute')
		.option('--configs <string...>', 'List of config values that will be accessable', [])
		.description(`Bind your site environment variables to a command`)

		.action(async (commands: string[] = [], opts: { configs: string[] }) => {
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

				if (Object.keys(env).length > 0) {
					note(wrap(list(env)), 'Bind Env')
				} else {
					log.warning('No bindings available.')
				}

				if (commands.length === 0) {
					return 'No command to execute.'
				}

				const command = commands.join(' ')
				const freshCred = await credentials()

				spawn(command, {
					env: {
						// Pass the process env vars
						...process.env,

						// Pass the site bind env vars
						...env,

						// Pass the app config name
						APP: appConfig.name,

						// Pass in the config values to load
						CONFIG: opts.configs.join(','),

						// Basic AWS info
						AWS_REGION: appConfig.region,
						AWS_ACCOUNT_ID: accountId,

						// Give AWS access
						AWS_ACCESS_KEY_ID: freshCred.accessKeyId,
						AWS_SECRET_ACCESS_KEY: freshCred.secretAccessKey,
						AWS_SESSION_TOKEN: freshCred.sessionToken,
					},
					stdio: 'inherit',
					shell: true,
				})

				return
			})
		})
}
