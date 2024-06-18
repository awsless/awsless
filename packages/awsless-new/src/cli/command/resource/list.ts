import { Stack, URN } from '@awsless/formation'
import chalk from 'chalk'
import { Command } from 'commander'
import { createApp } from '../../../app.js'
import { getAccountId, getCredentials } from '../../../util/aws.js'
import { layout } from '../../ui/complex/layout.js'
import { color } from '../../ui/style.js'
import { table } from '../../ui/util.js'

export const list = (program: Command) => {
	program
		.command('list')
		.description(`List all defined resources`)
		.action(async () => {
			await layout('resource list', async ({ appConfig, stackConfigs }) => {
				// ---------------------------------------------------
				const region = appConfig.region
				const credentials = getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)

				const { app } = createApp({ appConfig, stackConfigs, accountId })
				const resources: string[][] = []

				const formatResource = (stack: Stack, urn: URN) => {
					return urn
						.replace(stack.urn + ':', '')
						.replace(/\{([a-z0-9\-\s\/\._]+)\}/gi, (_, v) => {
							return `${color.dim('{')}${color.warning(v)}${color.dim('}')}`
						})
						.replaceAll(':', color.dim(':'))
				}

				for (const stack of app.stacks) {
					for (const resource of stack.resources) {
						resources.push([
							chalk.magenta(stack.name),
							// resource.type,
							formatResource(stack, resource.urn),
						])
					}
				}

				// const maxWidth = process.stdout.columns - 8
				// const colWidths = [Math.floor(maxWidth / 8), Math.floor(maxWidth / 4), Math.floor(maxWidth / 1.5)]

				console.log(
					table({
						// colWidths,
						head: ['stack', 'urn'],
						body: resources,
					})
				)
			})
		})
}
