import { readFile } from 'fs/promises'
import { join } from 'path'
import { log } from '@awsless/clui'
import { color as chalk } from '@awsless/clui'
import { constantCase } from 'change-case'
import { Command } from 'commander'
import { createApp } from '../../app.js'
import { ExpectedError } from '../../error.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { directories } from '../../util/path.js'
import { createWorkSpace } from '../../util/workspace.js'
import { layout } from '../ui/complex/layout.js'
import { color } from '../ui/style.js'

// The command takes over the terminal & the run ends with its exit
// code, since an outro would land in the middle of its output.
const runCommand = async (
	commands: string[],
	env: Record<string, string | undefined>,
	exit: (code: number) => never
) => {
	console.log(chalk.black(`│`))
	console.log(chalk.black(`└  ${chalk.yellow(commands.join(' '))}`))
	console.log('')

	const instance = Bun.spawn(commands, {
		env,
		stdout: 'inherit',
		stderr: 'inherit',
	})

	await instance.exited

	// A signal termination has no exit code, but is still a failure.
	exit(instance.exitCode ?? 1)
}

export const bind = (program: Command) => {
	program
		.command('bind')

		.argument('[command...]', 'The command to execute')
		.option('--config <string...>', 'List of config values that will be accessable', v => v.split(','))
		.option('--local', 'Bind against the running local dev environment instead of the deployed app')
		.description(`Bind your site environment variables to a command`)

		.action(async (commands: string[] = [], opts: { config?: string[]; local?: boolean }) => {
			await layout('bind', async ({ appConfig, stackConfigs, exit }) => {
				// The local dev environment persists its env, so sibling
				// commands run against the local emulators.
				if (opts.local) {
					const file = join(directories.output, 'local', 'env.json')
					let env: Record<string, string>

					try {
						env = JSON.parse(await readFile(file, 'utf8'))
					} catch {
						throw new ExpectedError('No local dev environment found. Start it first with: awsless dev')
					}

					// The runtime resolves configs from the CONFIGS comma list,
					// merged with whatever the dev environment already
					// announces.
					const configs: Record<string, string> = {}
					const configList = opts.config ?? []

					if (configList.length > 0) {
						configs.CONFIGS = [
							...new Set([...(env.CONFIGS ? env.CONFIGS.split(',') : []), ...configList]),
						].join(',')
					}

					if (commands.length === 0) {
						return 'No command to execute.'
					}

					return runCommand(
						commands,
						{
							...process.env,
							...env,
							...configs,
						},
						exit
					)
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
				} else {
					log.warning('No bindings available.')
				}

				const configList = opts.config ?? []
				const configs: Record<string, string> = {}
				if (configList.length > 0) {
					configs.CONFIGS = configList.join(',')
				}

				if (configList.length > 0) {
					log.note('Bind Config', configList.map(v => color.label(constantCase(v))).join('\n'))
				}

				if (commands.length === 0) {
					return 'No command to execute.'
				}

				const freshCred = await credentials()

				return runCommand(
					commands,
					{
						...process.env,
						...env,
						...configs,

						APP: appConfig.name,
						AWS_REGION: appConfig.region,
						AWS_ACCOUNT_ID: accountId,

						AWS_ACCESS_KEY_ID: freshCred.accessKeyId,
						AWS_SECRET_ACCESS_KEY: freshCred.secretAccessKey,
						AWS_SESSION_TOKEN: freshCred.sessionToken,
					},
					exit
				)
			})
		})
}
