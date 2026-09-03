import { log } from '@awsless/clui'
import { color as chalk } from '@awsless/clui'
import { DynamoDBClient } from '@awsless/dynamodb'
import { ResourceStatus, URN } from '@terraforge/core'
import { Command } from 'commander'
import wildstring from 'wildstring'
import { createApp } from '../../app.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { currentDeployment } from '../../util/deployment.js'
import { generateGlobalAppId } from '../../util/name.js'
import { createWorkSpace } from '../../util/workspace.js'
import { layout } from '../ui/complex/layout.js'
import { color, icon } from '../ui/style.js'

export const resources = (program: Command) => {
	program
		.command('resources')
		.argument('[stacks...]', 'Optionally filter stack resources to list')
		.description(`List all defined resources in your app`)
		.action(async (filters: string[]) => {
			await layout('resources', async ({ appConfig, stackConfigs }) => {
				// ---------------------------------------------------
				const region = appConfig.region
				const profile = appConfig.profile
				const credentials = await getCredentials(profile)
				const accountId = await getAccountId(credentials, region)

				// Build the graph with the last deployed id, so the deployment
				// resources don't show up as changed right after a deploy.
				const dynamo = new DynamoDBClient({ credentials, region })
				const deployment = await currentDeployment(
					dynamo,
					generateGlobalAppId({ accountId, region, appName: appConfig.name })
				)

				const { app, ready } = createApp({ appConfig, stackConfigs, accountId, deploymentId: deployment?.id })

				ready()

				const { workspace } = await createWorkSpace({
					credentials,
					accountId,
					region,
				})

				const stacks = await workspace.status(app)

				const formatResource = (stackUrn: URN, urn: URN) => {
					return urn
						.replace(stackUrn + ':', '')
						.replace(/\{([a-z0-9\-\s/.@_]+)\}/gi, (_, v) => {
							return `${color.dim('{')}${color.warning(v)}${color.dim('}')}`
						})
						.replaceAll(':', color.dim(':'))
				}

				const formatStatus = (status: ResourceStatus) => {
					if (status === 'created') {
						return color.success(status)
					}

					if (status === 'changed') {
						return color.warning(status)
					}

					if (status === 'pending') {
						return color.info(status)
					}

					return color.dim(status)
				}

				for (const stack of stacks) {
					if (filters.length > 0) {
						const found = filters.find(f => wildstring.match(f, stack.name))

						if (!found) {
							continue
						}
					}

					log.step(chalk.magenta(stack.name))

					if (stack.resources.length) {
						log.message(
							stack.resources
								.map(r => {
									return [
										//
										formatStatus(r.status),
										color.dim(icon.arrow.right),
										formatResource(stack.urn, r.urn),
									].join(' ')
								})
								.join('\n')
						)
					} else {
						log.message(color.line(`(empty)`))
					}
				}
			})
		})
}
