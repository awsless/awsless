import { Command } from 'commander'
import { layout } from '../../ui/complex/layout.js'
import { SsmStore } from '../../../util/ssm.js'
import { getAccountId, getCredentials } from '../../../util/aws.js'
import { log, spinner } from '@clack/prompts'
import { table } from '../../ui/util.js'
import chalk from 'chalk'
import { createApp } from '../../../app.js'
import { color } from '../../ui/style.js'

export const list = (program: Command) => {
	program
		.command('list')
		.description(`List all config value's`)
		.action(async () => {
			await layout('config list', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const credentials = getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)

				const { configs } = createApp({ appConfig, stackConfigs, accountId })

				const params = new SsmStore({
					credentials,
					appConfig,
				})

				const spin = spinner()
				spin.start('Loading config parameters')

				const values = await params.list()

				spin.stop('Done loading config values.')

				const requiredValues = [...configs].map(key => {
					if (typeof values[key] !== 'undefined') {
						return [chalk.magenta(key), values[key]!]
					} else {
						return [chalk.magenta(key), color.warning('(empty)')]
					}
				})

				const unsusedValues = Object.entries(values)
					.map(([key, value]) => {
						if (!configs.has(key)) {
							return [chalk.magenta(key), `${value} ${color.error('(unused)')}`]
						}

						return undefined
					})
					.filter(Boolean) as [string, string][]

				const allValues = [...requiredValues, ...unsusedValues]

				if (requiredValues.length > 0) {
					console.log(
						table({
							head: ['name', 'value'],
							body: allValues,
						})
					)
				} else {
					log.warning('No config parameters found.')
				}
			})
		})
}
