import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { log, prompt } from '@awsless/clui'
import { Command, InvalidArgumentError } from 'commander'
import { isAfter, isBefore, subHours } from 'date-fns'
import { Cancelled } from '../../error.js'
import { getRouteStoreArn, pruneStoreDeployments } from '../../formation/cloudfront-kvs.js'
import { isError } from '../../util/aws.js'
import {
	listDeployments,
	pruneFunctionVersion,
	PruneOptions,
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

// Every site deploy uploads its files under a content-hashed
// 'site/<stack>/<id>/v-<hash>/' prefix that route table rewrites point
// at, so prefixes without a surviving route reference are garbage.
const pruneSiteVersions = async (props: { s3: S3Client; bucket: string; survivingRoutes: string[] }) => {
	const referenced = new Set<string>()

	for (const value of props.survivingRoutes) {
		let parsed: unknown

		try {
			parsed = JSON.parse(value)
		} catch {
			continue
		}

		for (const route of Array.isArray(parsed) ? parsed : [parsed]) {
			const to = (route as { rewrite?: { to?: unknown } })?.rewrite?.to

			if (typeof to !== 'string') {
				continue
			}

			const parts = to.replace(/^\//, '').split('/')

			if (parts[0] === 'site' && parts[3]?.startsWith('v-')) {
				referenced.add(parts.slice(0, 4).join('/'))
			}
		}
	}

	const unreferenced = new Map<string, { keys: string[]; newest: Date }>()
	let cursor: string | undefined

	do {
		let page
		try {
			page = await props.s3.send(
				new ListObjectsV2Command({
					Bucket: props.bucket,
					Prefix: 'site/',
					ContinuationToken: cursor,
				})
			)
		} catch (error) {
			// Apps without sites never made the shared bucket.
			if (isError(error, 'NoSuchBucket')) {
				return
			}

			throw error
		}
		cursor = page.NextContinuationToken

		for (const object of page.Contents ?? []) {
			const key = object.Key!
			const parts = key.split('/')
			const prefix = parts.slice(0, 4).join('/')

			if (!parts[3]?.startsWith('v-') || referenced.has(prefix)) {
				continue
			}

			const modified = object.LastModified ?? new Date()
			const entry = unreferenced.get(prefix) ?? { keys: [], newest: modified }
			entry.keys.push(key)
			entry.newest = isAfter(modified, entry.newest) ? modified : entry.newest
			unreferenced.set(prefix, entry)
		}
	} while (cursor)

	// A fresh prefix may belong to a crashed deploy whose retry reuses it
	// without re-uploading, so only day-old prefixes are garbage.
	const cutoff = subHours(new Date(), 24)
	const garbage = [...unreferenced.values()]
		.filter(entry => isBefore(entry.newest, cutoff))
		.flatMap(entry => entry.keys)

	for (let index = 0; index < garbage.length; index += 1000) {
		await props.s3.send(
			new DeleteObjectsCommand({
				Bucket: props.bucket,
				Delete: { Objects: garbage.slice(index, index + 1000).map(key => ({ Key: key })) },
			})
		)
	}
}

export const prune = (program: Command) => {
	program
		.command('prune')
		.option('--branch <branch>', 'Only prune the deployments of the given branch')
		.option(
			'--keep <count>',
			'How many deployments of the main branch to keep',
			value => {
				const keep = Number(value)

				if (!Number.isInteger(keep) || keep < 0) {
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
								const survivingRoutes = await pruneStoreDeployments(
									kvs,
									storeArn,
									prune.map(item => item.id)
								)

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

				return `Pruned ${prunable.length} deployments.`
			})
		})
}
