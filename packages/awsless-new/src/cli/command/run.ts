import { isCancel, select } from '@clack/prompts'
import { Command as CliCommand } from 'commander'
import minimist from 'minimist'
import { join } from 'path'
import { tsImport } from 'tsx/esm/api'
import { createApp } from '../../app.js'
import { Command, CommandHandler } from '../../command.js'
import { Cancelled } from '../../error.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { directories } from '../../util/path.js'
import { layout } from '../ui/complex/layout.js'
import { task } from '../ui/util.js'

export const run = (program: CliCommand) => {
	program
		.command('run')
		// .allowExcessArguments(true)
		.allowUnknownOption(true)
		// .passThroughOptions(true)
		.argument('[command]', 'The command you want to run')
		.description('Run one of your defined commands.')
		.action(async (selected: string | undefined) => {
			await layout(`run ${selected}`, async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const credentials = getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)
				const { commands } = createApp({ appConfig, stackConfigs, accountId })

				// ---------------------------------------------------
				// Select the command

				let command: Command | undefined

				if (selected) {
					command = commands.find(cmd => {
						return cmd.name === selected
					})
				} else {
					const selected = await select({
						message: 'Pick the command you want to run:',
						initialValue: commands[0],
						options: commands.map(cmd => ({
							value: cmd,
							label: cmd.name,
							hint: cmd.description,
						})),
					})

					if (isCancel(selected)) {
						throw new Cancelled()
					}

					command = selected
				}

				if (!command) {
					throw new Error(`The provided command doesn't exist.`)
				}

				// ---------------------------------------------------
				// Set env vars

				process.env.APP = appConfig.name

				// ---------------------------------------------------
				// Run command

				const module = await tsImport(command.file, {
					parentURL: import.meta.url,
				})

				const handler: CommandHandler | undefined = module[command.handler]

				if (!handler) {
					throw new Error(`No "${command.handler}" handler found.`)
				}

				const result = await task('Running', update => {
					const options: Record<string, any> = minimist(program.args)
					delete options._

					return handler(options, {
						region,
						credentials,
						accountId,
						update,
					})
				})

				return result
			})
		})
}
