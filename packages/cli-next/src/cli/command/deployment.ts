import { CloudFrontClient } from '@aws-sdk/client-cloudfront'
import { CloudFrontKeyValueStoreClient } from '@aws-sdk/client-cloudfront-keyvaluestore'
import { DeleteFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { log, prompt } from '@awsless/clui'
import { DynamoDBClient } from '@awsless/dynamodb'
import { Command } from 'commander'
import { AppConfig } from '../../config/app.js'
import { Cancelled } from '../../error.js'
import { getRouteStoreArn, pruneStoreDeployments } from '../../formation/cloudfront-kvs.js'
import { getAccountId, getCredentials, isError } from '../../util/aws.js'
import {
	isCommitMerged,
	listDeployments,
	readLiveDeploymentId,
	removeDeployment,
	slugifyBranch,
	withAppReleaseLock,
} from '../../util/deployment.js'
import { deleteLambdaAlias, getDeploymentLambdaAliasName, getLambdaAlias, LIVE_LAMBDA_ALIAS } from '../../util/lambda.js'
import { formatGlobalResourceName, generateGlobalAppId, getBundleFunctionName } from '../../util/name.js'
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
						.map(item => {
							const status =
								item.id === liveId
									? color.success('live    ')
									: item.promotedAt
										? 'promoted'
										: item.functionVersion
											? color.info('staged  ')
											: color.dim('pending ')

							return [
								color.label(item.id.padEnd(idWidth)),
								status,
								formatAge(item.createdAt).padEnd(8),
								color.dim(item.commit?.slice(0, 7) ?? '-------'),
								(item.message ?? '').slice(0, 50).padEnd(50),
								color.dim(item.user ?? ''),
							].join('  ')
						})
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
		.action(async (options: { branch?: string; keep: string; main: string }) => {
			await layout('prune', async ({ appConfig }) => {
				const { appId, functionName, dynamo, lambda, kvs, cloudfront } = await createClients(appConfig)

				const [items, liveId] = await Promise.all([
					listDeployments(dynamo, appId),
					readLiveDeploymentId(lambda, functionName),
				])

				// The live deployment & the newest other promoted deployment
				// always survive, so a rollback keeps a target.
				const rollbackTarget = items
					.filter(item => item.promotedAt && item.id !== liveId)
					.sort((a, b) => b.promotedAt!.localeCompare(a.promotedAt!))[0]

				const keep = Math.max(1, Number(options.keep) || 10)
				const mainSlug = slugifyBranch(options.main)
				const keptMain = new Set(
					items
						.filter(item => item.branch === mainSlug && item.functionVersion)
						.map(item => item.seq)
						.sort((a, b) => b - a)
						.slice(0, keep)
				)
				const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

				const prunable = items.filter(item => {
					if (item.id === liveId || item.id === rollbackTarget?.id) {
						return false
					}

					if (options.branch) {
						return item.branch === slugifyBranch(options.branch)
					}

					// deploys that never finished are abandoned after a day
					if (!item.functionVersion) {
						return item.createdAt < dayAgo
					}

					if (item.branch === mainSlug) {
						return !keptMain.has(item.seq)
					}

					// branch deployments are prunable once their commit is merged
					return item.commit ? isCommitMerged(item.commit, options.main) : false
				})

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
							// the aliases go first, so shared function
							// versions become deletable
							for (const item of prunable) {
								await deleteLambdaAlias(lambda, functionName, getDeploymentLambdaAliasName(item.id))
							}

							// function versions that no surviving deployment references
							const surviving = items.filter(item => !prunable.includes(item))
							const keepVersions = new Set(surviving.map(item => item.functionVersion))
							const live = await getLambdaAlias(lambda, functionName, LIVE_LAMBDA_ALIAS)

							if (live?.FunctionVersion) {
								keepVersions.add(live.FunctionVersion)
							}

							const versions = new Set(
								prunable
									.map(item => item.functionVersion)
									.filter(version => version && !keepVersions.has(version))
							)

							for (const version of versions) {
								try {
									await lambda.send(
										new DeleteFunctionCommand({
											FunctionName: functionName,
											Qualifier: version,
										})
									)
								} catch (error) {
									if (
										!isError(error, 'ResourceNotFoundException') &&
										!isError(error, 'ResourceConflictException')
									) {
										throw error
									}
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
									prunable.map(item => item.id)
								)
							}

							// the manifest records go last, so an interrupted
							// prune can simply be re-run
							for (const item of prunable) {
								await removeDeployment(dynamo, appId, item.id)
							}
						}),
				})

				return `Pruned ${prunable.length} deployments.`
			})
		})
}
