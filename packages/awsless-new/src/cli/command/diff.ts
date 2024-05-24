import { aws, Stack, URN, WorkSpace } from '@awsless/formation'
import chalk from 'chalk'
import { Command } from 'commander'
import { createApp } from '../../app.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { bootstrapAwsless } from '../ui/complex/bootstrap-awsless.js'
import { buildAssets } from '../ui/complex/build-assets.js'
import { layout } from '../ui/complex/layout.js'
import { color } from '../ui/style.js'
import { table, task } from '../ui/util.js'

export const diff = (program: Command) => {
	program
		.command('diff')
		.description('Diff your app with AWS')
		.action(async (filters: string[]) => {
			await layout('diff', async ({ appConfig, stackConfigs }) => {
				const region = appConfig.region
				const credentials = getCredentials(appConfig.profile)
				const accountId = await getAccountId(credentials, region)

				// ---------------------------------------------------
				// deploy the bootstrap first...

				await bootstrapAwsless({ credentials, region })

				// ---------------------------------------------------

				const { app, builders } = createApp({ appConfig, stackConfigs, accountId }, filters)

				// ---------------------------------------------------
				// Building stack assets & templates & tests

				// await buildTypes(appConfig, stackConfigs)
				await buildAssets(builders)

				// ---------------------------------------------------

				const workspace = new WorkSpace({
					stateProvider: new aws.dynamodb.DynamoDBStateProvider({
						credentials,
						region,
						tableName: 'awsless-state',
					}),
					cloudProviders: aws.createCloudProviders({
						credentials,
						region: appConfig.region,
					}),
				})

				let total = 0
				const changes: string[][] = []

				const formatResource = (stack: Stack, urn: URN) => {
					return urn
						.replace(stack.urn + ':', '')
						.replace(/\{([a-z0-9\-]+)\}/gi, (_, v) => {
							return `${color.dim('{')}${color.warning(v)}${color.dim('}')}`
						})
						.replaceAll(':', color.dim(':'))
				}

				await task('Find app differences', async () => {
					for (const stack of app.stacks) {
						const diff = await workspace.diffStack(stack)

						total += diff.creates.length
						total += diff.updates.length
						total += diff.deletes.length

						changes.push(
							...diff.creates.map(v => [
								chalk.magenta(stack.name),
								color.success`create`,
								formatResource(stack, v),
							]),
							...diff.updates.map(v => [
								chalk.magenta(stack.name),
								color.warning`update`,
								formatResource(stack, v),
							]),
							...diff.deletes.map(v => [
								chalk.magenta(stack.name),
								color.error`delete`,
								formatResource(stack, v),
							])
						)
					}

					return 'Done finding app differences.'
				})

				if (total > 0) {
					console.log(
						table({
							head: ['stack', 'operation', 'resource'],
							body: changes,
						})
					)
				}

				return `${color.warning(total)} resources have changed.`
			})
		})
}
