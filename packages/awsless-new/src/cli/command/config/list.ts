import { Command } from 'commander'
import { layout } from '../../ui/complex/layout.js'
import { SsmStore } from '../../../util/ssm.js'
import { getCredentials } from '../../../util/aws.js'
import { log, spinner } from '@clack/prompts'
import { table } from '../../ui/util.js'
import chalk from 'chalk'

export const list = (program: Command) => {
	program
		.command('list')
		.description(`List all config value's`)
		.action(async () => {
			await layout('config list', async ({ appConfig }) => {
				const credentials = getCredentials(appConfig.profile)
				const params = new SsmStore({
					credentials,
					appConfig,
				})

				const spin = spinner()
				spin.start('Loading config parameters')

				const values = await params.list()

				spin.stop('Done loading config values.')

				if (Object.keys(values).length > 0) {
					console.log(
						table({
							head: ['name', 'value'],
							body: Object.entries(values).map(([k, v]) => [chalk.magenta(k), v]),
						})
					)
				} else {
					log.warning('No config parameters found.')
				}
			})
		})
}
