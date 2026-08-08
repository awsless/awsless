import { CloudFrontClient } from '@aws-sdk/client-cloudfront'
import { CloudFrontKeyValueStoreClient } from '@aws-sdk/client-cloudfront-keyvaluestore'
import { LambdaClient } from '@aws-sdk/client-lambda'
import { log, prompt } from '@awsless/clui'
import { DynamoDBClient } from '@awsless/dynamodb'
import { Command } from 'commander'
import { AppConfig } from '../../config/app.js'
import { Cancelled } from '../../error.js'
import { getRouteStoreArn, pruneStoreDeployments } from '../../formation/cloudfront-kvs.js'
import { getAccountId, getCredentials } from '../../util/aws.js'
import { deleteLambdaAlias, listLambdaFunctions } from '../../util/lambda.js'
import {
	Deployment,
	listDeployments,
	pruneFunctionVersion,
	PruneOptions,
	readLiveDeploymentId,
	removeDeployment,
	selectPrunableDeployments,
	selectPrunableVersions,
	withAppReleaseLock,
} from '../../util/deployment.js'
import {
	formatGlobalResourceName,
	generateGlobalAppId,
	getAppNamePrefix,
	getBundleFunctionName,
} from '../../util/name.js'
import { layout } from '../ui/complex/layout.js'
import { color } from '../ui/style.js'

const createClients = async (appConfig: AppConfig) => {
	const region = appConfig.region
	const credentials = await getCredentials(appConfig.profile)
	const accountId = await getAccountId(credentials, region)

	return {
		appId: generateGlobalAppId({ accountId, region, appName: appConfig.name }),
		functionName: getBundleFunctionName(appConfig.name),
		dynamo: new DynamoDBClient({ credentials, region }),
		lambda: new LambdaClient({ credentials, region }),
		kvs: new CloudFrontKeyValueStoreClient({ credentials, region }),
		cloudfront: new CloudFrontClient({ credentials, region: 'us-east-1' }),
	}
}

const formatAge = (iso: string) => {
	const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60_000)

	if (minutes < 1) return 'just now'
	if (minutes < 60) return `${minutes}m ago`
	if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h ago`

	return `${Math.floor(minutes / (60 * 24))}d ago`
}

const formatStatus = (item: Deployment, liveId?: string) => {
	if (item.id === liveId) return color.success('live    ')
	if (item.promotedAt) return 'promoted'
	if (item.functionVersion) return color.info('staged  ')

	return color.dim('pending ')
}

export const deployments = (program: Command) => {
	program
		.command('deployments')
		.description('List the deployment history of your app')
		.action(async () => {
			await layout('deployments', async ({ appConfig }) => {
				const { appId, functionName, dynamo, lambda } = await createClients(appConfig)

				const [items, liveId] = await Promise.all([
					listDeployments(dynamo, appId),
					readLiveDeploymentId(lambda, functionName),
				])

				if (items.length === 0) {
					return `No deployments found.`
				}

				const idWidth = Math.max(...items.map(item => item.id.length))

				log.message(
					items
						.map(item =>
							[
								color.label(item.id.padEnd(idWidth)),
								formatStatus(item, liveId),
								formatAge(item.createdAt).padEnd(8),
								color.dim(item.commit?.slice(0, 7) ?? '-------'),
								(item.message ?? '').slice(0, 50).padEnd(50),
								color.dim(item.user ?? ''),
							].join('  ')
						)
						.join('\n')
				)

				return `Found ${items.length} deployments.`
			})
		})
}

export const prune = (program: Command) => {
	program
		.command('prune')
		.option('--branch <branch>', 'Only prune the deployments of the given branch')
		.option('--keep <count>', 'How many deployments of the main branch to keep', '10')
		.option('--main <branch>', 'The branch that merged work lands on', 'main')
		.description('Delete old deployments & the resources they hold on to')
		.action(async (options: PruneOptions) => {
			await layout('prune', async ({ appConfig }) => {
				const { appId, functionName, dynamo, lambda, kvs, cloudfront } = await createClients(appConfig)

				const [items, liveId] = await Promise.all([
					listDeployments(dynamo, appId),
					readLiveDeploymentId(lambda, functionName),
				])

				const prunable = selectPrunableDeployments(items, liveId, options)

				if (prunable.length === 0) {
					return `Nothing to prune.`
				}

				log.message(prunable.map(item => color.label(item.id)).join('\n'))

				if (!process.env.SKIP_PROMPT) {
					const ok = await prompt.confirm({
						message: `Are you sure you want to delete these ${prunable.length} deployments?`,
					})

					if (!ok) {
						throw new Cancelled()
					}
				}

				await log.task({
					initialMessage: 'Pruning the deployments',
					successMessage: 'Done pruning the deployments.',
					task: () =>
						withAppReleaseLock(appConfig, async () => {
							// Redone under the lock, narrowed to what was confirmed.
							const [freshItems, freshLiveId] = await Promise.all([
								listDeployments(dynamo, appId),
								readLiveDeploymentId(lambda, functionName),
							])

							const confirmed = new Set(prunable.map(item => item.id))
							const prune = selectPrunableDeployments(freshItems, freshLiveId, options).filter(item =>
								confirmed.has(item.id)
							)
							const survivingIds = new Set(
								freshItems.filter(item => !prune.includes(item)).map(item => item.id)
							)

							// The aliases of the pruned deployments go first, so
							// their function versions lose their references &
							// become deletable.
							for (const name of await listLambdaFunctions(lambda, getAppNamePrefix(appConfig.name))) {
								for (const item of prune) {
									await deleteLambdaAlias(lambda, name, item.id)
								}

								for (const version of await selectPrunableVersions({
									lambda,
									functionName: name,
									survivingIds,
								})) {
									await pruneFunctionVersion(lambda, name, version)
								}
							}

							// the route store entries & orphaned route tables
							const storeArn = await getRouteStoreArn(
								cloudfront,
								formatGlobalResourceName({
									appName: appConfig.name,
									resourceType: 'router',
									resourceName: 'store',
								})
							)

							if (storeArn) {
								await pruneStoreDeployments(
									kvs,
									storeArn,
									prune.map(item => item.id)
								)
							}

							// the manifest records go last, so an interrupted
							// prune can simply be re-run
							for (const item of prune) {
								await removeDeployment(dynamo, appId, item.id)
							}
						}),
				})

				return `Pruned ${prunable.length} deployments.`
			})
		})
}
