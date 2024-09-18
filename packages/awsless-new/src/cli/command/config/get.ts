import { note, spinner } from '@clack/prompts'
import chalk from 'chalk'
import { Command } from 'commander'
import { getCredentials } from '../../../util/aws.js'
import { SsmStore } from '../../../util/ssm.js'
import { layout } from '../../ui/complex/layout.js'
import { color } from '../../ui/style.js'
import { list } from '../../ui/util.js'

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
						Value: value ?? color.warning('(empty)'),
					})
				)
			})
		})
}
