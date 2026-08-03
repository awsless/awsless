import { log } from '@awsless/clui'
import chalk from 'chalk'
import { constantCase } from 'change-case'
import { Command } from 'commander'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { createApp } from '../../app.js'
import { ExpectedError } from '../../error.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { directories } from '../../util/path.js'
import { createWorkSpace } from '../../util/workspace.js'
import { layout } from '../ui/complex/layout.js'
import { color } from '../ui/style.js'

export const bind = (program: Command) => {
	program
		.command('bind')

		.argument('[command...]', 'The command to execute')
		.option('--config <string...>', 'List of config values that will be accessable', v => v.split(','))
		.option('--local', 'Bind against the running local dev environment instead of the deployed app')
		.description(`Bind your site environment variables to a command`)

		.action(async (commands: string[] = [], opts: { config?: string[]; local?: boolean }) => {
			await layout('bind', async ({ appConfig, stackConfigs }) => {
				// The local dev environment persists its env, so sibling
				// commands run against the local emulators.
				if (opts.local) {
					const file = join(directories.output, 'local', 'env.json')
					let env: Record<string, string>

					try {
						env = JSON.parse(await readFile(file, 'utf8'))
					} catch (_) {
						throw new ExpectedError('No local dev environment found. Start it first with: awsless dev')
					}

					const configs: Record<string, string> = {}
					for (const name of opts.config ?? []) {
						configs[`CONFIG_${constantCase(name)}`] = name
					}

					if (commands.length === 0) {
						return 'No command to execute.'
					}

					console.log(chalk.black(`│`))
					console.log(chalk.black(`└  ${chalk.yellow(commands.join(' '))}`))
					console.log('')

					const instance = Bun.spawn(commands, {
						env: {
							...process.env,
							...env,
							...configs,
						},
						stdout: 'inherit',
						stderr: 'inherit',
					})

					await instance.exited
					process.exit(instance.exitCode ?? 1)
				}

				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				const { app, binds } = createApp({ appConfig, stackConfigs, accountId })

				const { workspace } = await createWorkSpace({
					credentials,
					accountId,
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

				// const command = commands.join(' ')
				const freshCred = await credentials()

				console.log(chalk.black(`│`))
				console.log(chalk.black(`└  ${chalk.yellow(commands.join(' '))}`))
				console.log('')

				const instance = Bun.spawn(commands, {
					// cwd: process.cwd(),
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
					stdout: 'inherit',
					stderr: 'inherit',
				})

				await instance.exited

				// A signal termination has no exit code, but is still a failure.
				process.exit(instance.exitCode ?? 1)

				// return
			})
		})
}
