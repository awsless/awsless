import { log, prompt } from '@awsless/clui'
import { Command, InvalidArgumentError } from 'commander'
import { Cancelled } from '../../error.js'
import { getRouteStoreArn, pruneStoreDeployments } from '../../formation/cloudfront-kvs.js'
import {
	listDeployments,
	pruneFunctionVersion,
	PruneOptions,
	pruneSiteVersions,
	readLiveDeploymentId,
	removeDeployment,
	selectPrunableDeployments,
	selectPrunableVersions,
	withAppReleaseLock,
} from '../../util/deployment.js'
import { deleteLambdaAlias, listLambdaFunctions } from '../../util/lambda.js'
import { formatGlobalResourceName, getAppNamePrefix } from '../../util/name.js'
import { layout } from '../ui/complex/layout.js'
import { color } from '../ui/style.js'
import { createClients } from './deployment.js'

export const prune = (program: Command) => {
	program
		.command('prune')
		.option('--branch <branch>', 'Only prune the deployments of the given branch')
		.option(
			'--keep <count>',
			'How many deployments of the main branch to keep',
			value => {
				const keep = Number(value)

				if (!Number.isInteger(keep) || keep < 1) {
					throw new InvalidArgumentError('Expected a positive number.')
				}

				return keep
			},
			10
		)
		.option('--main <branch>', 'The branch that merged work lands on', 'main')
		.description('Delete old deployments & the resources they hold on to')
		.action(async (options: PruneOptions) => {
			await layout('prune', async ({ appConfig }) => {
				const { appId, functionName, dynamo, lambda, kvs, cloudfront, s3 } = await createClients(appConfig)

				const [items, liveId] = await Promise.all([
					listDeployments(dynamo, appId),
					readLiveDeploymentId(lambda, functionName),
				])

				// The garbage sweeps below still run without prunable
				// deployments, so leftovers of earlier prunes get collected.
				const prunable = selectPrunableDeployments(items, liveId, options)

				if (prunable.length > 0) {
					log.message(prunable.map(item => color.label(item.id)).join('\n'))

					if (!process.env.SKIP_PROMPT) {
						const ok = await prompt.confirm({
							message: `Are you sure you want to delete these ${prunable.length} deployments?`,
						})

						if (!ok) {
							throw new Cancelled()
						}
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

							// the route store entries & orphaned route tables,
							// swept per router store
							const survivingRoutes: string[] = []
							let sweptStores = false

							for (const routerId of Object.keys(appConfig.router ?? {})) {
								const storeArn = await getRouteStoreArn(
									cloudfront,
									formatGlobalResourceName({
										appName: appConfig.name,
										resourceType: 'router',
										resourceName: routerId,
									})
								)

								if (!storeArn) {
									continue
								}

								sweptStores = true
								survivingRoutes.push(
									...(await pruneStoreDeployments(
										kvs,
										storeArn,
										prune.map(item => item.id)
									))
								)
							}

							if (sweptStores) {
								// the site versions that no surviving route table references
								await pruneSiteVersions({
									s3,
									bucket: formatGlobalResourceName({
										appName: appConfig.name,
										resourceType: 'store',
										resourceName: 'assets',
										postfix: appId,
									}),
									survivingRoutes,
								})
							}

							// the manifest records go last, so an interrupted
							// prune can simply be re-run
							for (const item of prune) {
								await removeDeployment(dynamo, appId, item.id)
							}
						}),
				})

				return prunable.length > 0 ? `Pruned ${prunable.length} deployments.` : `Nothing to prune.`
			})
		})
}
