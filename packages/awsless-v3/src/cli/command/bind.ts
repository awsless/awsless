import { log } from '@awsless/clui'
import { constantCase } from 'change-case'
import { spawn } from 'child_process'
import { Command } from 'commander'
import { createApp } from '../../app.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { createWorkSpace } from '../../util/workspace.js'
import { layout } from '../ui/complex/layout.js'
import { color } from '../ui/style.js'
// import { list, wrap } from '../ui/util.js'

export const bind = (program: Command) => {
	program
		.command('bind')

		.argument('[command...]', 'The command to execute')
		.option('--config <string...>', 'List of config values that will be accessable', v => v.split(','))
		.description(`Bind your site environment variables to a command`)

		.action(async (commands: string[] = [], opts: { config?: string[] }) => {
			await layout('bind', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)

				const { app, binds } = createApp({ appConfig, stackConfigs, accountId })

				const { workspace } = await createWorkSpace({
					credentials,
					accountId,
					profile,
					region,
				})

				await workspace.hydrate(app)

				const env: Record<string, string> = {}
				for (const { name, value } of binds) {
					env[name] = await value
				}

				if (Object.keys(env).length > 0) {
					log.list('Bind Env', env)
					// note(wrap(list(env)), 'Bind Env')
				} else {
					log.warning('No bindings available.')
				}

				const configList = opts.config ?? []
				const configs: Record<string, string> = {}
				for (const name of configList) {
					configs[`CONFIG_${constantCase(name)}`] = name
				}

				if (configList.length ?? 0 > 0) {
					log.note('Bind Config', configList.map(v => color.label(constantCase(v))).join('\n'))
					// note(wrap(configList.map(v => color.label(constantCase(v)))), 'Bind Config')
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

						// Pass in the config values to load
						...configs,

						// Pass the app config name
						APP: appConfig.name,

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
