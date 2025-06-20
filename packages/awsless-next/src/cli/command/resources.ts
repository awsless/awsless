import { log } from '@awsless/clui'
import { Stack, URN } from '@awsless/formation'
import chalk from 'chalk'
import { Command } from 'commander'
import wildstring from 'wildstring'
import { createApp } from '../../app.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { layout } from '../ui/complex/layout.js'
import { color } from '../ui/style.js'

export const resources = (program: Command) => {
	program
		.command('resources')
		.argument('[stacks...]', 'Optionally filter stack resources to list')
		.description(`List all defined resources in your app`)
		.action(async (filters: string[]) => {
			await layout('resources', async ({ appConfig, stackConfigs }) => {
				// ---------------------------------------------------
				const region = appConfig.region
				const credentials = getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)

				const { app } = createApp({ appConfig, stackConfigs, accountId })
				// const resources: string[][] = []

				const formatResource = (stack: Stack, urn: URN) => {
					return urn
						.replace(stack.urn + ':', '')
						.replace(/\{([a-z0-9\-\s\/\._]+)\}/gi, (_, v) => {
							return `${color.dim('{')}${color.warning(v)}${color.dim('}')}`
						})
						.replaceAll(':', color.dim(':'))
				}

				for (const stack of app.stacks) {
					if (filters.length > 0) {
						const found = filters.find(f => wildstring.match(f, stack.name))

						if (!found) {
							continue
						}
					}

					log.step(chalk.magenta(stack.name))
					log.message(stack.resources.map(resource => formatResource(stack, resource.$.urn)).join('\n'))
					// line('')

					// for (const resource of stack.resources) {
					// 	// log.message(formatResource(stack, resource.$.urn))
					// 	line(formatResource(stack, resource.$.urn))
					// 	// resources.push([
					// 	// 	chalk.magenta(stack.name),
					// 	// 	// resource.type,
					// 	// 	formatResource(stack, resource.urn),
					// 	// ])
					// }
				}
			})
		})
}
