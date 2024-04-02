import { Command } from 'commander'
import { color } from '../../ui/style.js'
import { layout } from '../../ui/complex/layout.js'
import { getCredentials } from '../../../util/aws.js'
import { SsmStore } from '../../../util/ssm.js'
import { note, spinner } from '@clack/prompts'
import { list } from '../../ui/util.js'
import chalk from 'chalk'

export const get = (program: Command) => {
	program
		.command('get <name>')
		.description('Get a config value')
		.action(async (name: string) => {
			await layout('config get', async ({ appConfig }) => {
				const credentials = getCredentials(appConfig.profile)
				const params = new SsmStore({
					credentials,
					appConfig,
				})

				const spin = spinner()
				spin.start(`Getting remote config parameter`)

				const value = await params.get(name)

				spin.stop(`Done getting remote config parameter.`)

				note(
					list({
						Name: chalk.magenta(name),
						Value: value ?? color.error('(empty)'),
					})
				)
			})
		})
}
