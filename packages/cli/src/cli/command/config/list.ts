import { log } from '@awsless/clui'
import { color as chalk } from '@awsless/clui'
import { Command } from 'commander'
import { createApp } from '../../../app.js'
import { SsmStore } from '../../../util/ssm.js'
import { layout } from '../../ui/complex/layout.js'
import { color } from '../../ui/style.js'
import { createClients } from '../util.js'

export const list = (program: Command) => {
	program
		.command('list')
		.description(`List all config value's`)
		.action(async () => {
			await layout('config list', async ({ appConfig, stackConfigs }) => {
				const { credentials, accountId } = await createClients(appConfig)

				const { configs } = createApp({ appConfig, stackConfigs, accountId })

				const params = new SsmStore({
					credentials,
					appConfig,
				})

				const values = await log.task({
					initialMessage: 'Loading config parameters...',
					successMessage: 'Done loading config values.',
					errorMessage: 'Failed loading config values.',
					task() {
						return params.list()
					},
				})

				const requiredValues = [...configs].map(key => {
					if (typeof values[key] !== 'undefined') {
						return [chalk.magenta(key), values[key]]
					} else {
						return [chalk.magenta(key), color.warning('(empty)')]
					}
				})

				const unusedValues = Object.entries(values)
					.map(([key, value]) => {
						if (!configs.has(key)) {
							return [chalk.magenta(key), `${value} ${color.error('(unused)')}`]
						}

						return undefined
					})
					.filter(Boolean) as [string, string][]

				const allValues = [...requiredValues, ...unusedValues]

				if (requiredValues.length > 0) {
					log.table({
						head: ['Name', 'Value'],
						body: allValues,
					})
				} else {
					log.warning('No config parameters found.')
				}
			})
		})
}
