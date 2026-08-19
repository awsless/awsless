import { userInfo } from 'node:os'
import { CloudFrontClient } from '@aws-sdk/client-cloudfront'
import { CloudFrontKeyValueStoreClient } from '@aws-sdk/client-cloudfront-keyvaluestore'
import { DeleteFunctionCommand, GetFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda'
import {
	AnyTable,
	define,
	deleteItem,
	DynamoDBClient,
	getItem,
	number,
	object,
	optional,
	putItem,
	query,
	string,
	updateItem,
} from '@awsless/dynamodb'
import { StateBackend } from '@terraforge/core'
import { isAfter, subHours } from 'date-fns'
import { AppConfig } from '../config/app.js'
import { ExpectedError } from '../error.js'
import {
	getRouteStoreArn,
	readActiveDeploymentId,
	readRouteDeployment,
	setActiveRouteDeployment,
	StagedRouteDeployment,
} from '../formation/cloudfront-kvs.js'
import { getAccountId, getCredentials, isError } from './aws.js'
import { currentBranch, currentCommit, currentCommitMessage, isCommitMerged } from './git.js'
import {
	deleteLambdaAlias,
	getLambdaAlias,
	listLambdaAliases,
	listLambdaFunctions,
	listLambdaVersions,
	LIVE_LAMBDA_ALIAS,
	upsertLambdaAlias,
} from './lambda.js'
import { formatGlobalResourceName, generateGlobalAppId, getAppNamePrefix, getBundleFunctionName } from './name.js'
import { createDeploymentBackends, getAppReleaseLockUrn } from './workspace.js'

// ------------------------------------------------------------
// A deployment id is a counter per git branch formatted as
// '<branch>-<seq>'. The one string is the manifest sort key, the
// deployment alias suffix, the route store key & the id users see.

// Lambda alias names only allow [a-zA-Z0-9-_].
export const slugifyBranch = (branch?: string) => {
	return (branch ?? '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'local'
}

// ------------------------------------------------------------
// The manifest table stores one record per deployment & is the source
// of the per branch sequence numbers. State is inferred from the
// fields: a deployed record has a functionVersion & a promoted
// record has a promotedAt timestamp.

const table = define('awsless-deployments', {
	hash: 'appId',
	sort: 'id',
	schema: object({
		appId: string(),
		id: string(),
		branch: string(),
		seq: number(),
		createdAt: string(),
		user: optional(string()),
		commit: optional(string()),
		message: optional(string()),
		functionVersion: optional(string()),
		promotedAt: optional(string()),
	}),
})

// Explicit types keep the deep table inference out of the emitted declarations.
export type Deployment = {
	appId: string
	id: string
	branch: string
	seq: number
	createdAt: string
	user?: string
	commit?: string
	message?: string
	functionVersion?: string
	promotedAt?: string
}

export const deploymentsTable: AnyTable = table

const latestBranchDeployment = async (client: DynamoDBClient, appId: string, branch: string) => {
	const items = await listDeployments(client, appId, branch)

	return items.sort((a, b) => b.seq - a.seq)[0]
}

export const claimDeployment = async (props: { client: DynamoDBClient; appId: string }): Promise<Deployment> => {
	const branch = slugifyBranch(currentBranch())

	// Retry when a concurrent deploy claims the same sequence number.
	while (true) {
		const latest = await latestBranchDeployment(props.client, props.appId, branch)
		const seq = (latest?.seq ?? 0) + 1
		const deployment: Deployment = {
			appId: props.appId,
			id: `${branch}-${seq}`,
			branch,
			seq,
			createdAt: new Date().toISOString(),
			user: userInfo().username,
			commit: currentCommit(),
			message: currentCommitMessage(),
		}

		try {
			await putItem(table, deployment, {
				when: e => e.id.notExists(),
				client: props.client,
			})
		} catch (error) {
			if (isError(error, 'ConditionalCheckFailedException')) {
				continue
			}

			throw error
		}

		return deployment
	}
}

// Non-deploy commands build the same graph as the last deploy of the branch.
export const currentDeployment = async (client: DynamoDBClient, appId: string) => {
	return latestBranchDeployment(client, appId, slugifyBranch(currentBranch()))
}

export const getDeployment = async (client: DynamoDBClient, appId: string, id: string) => {
	return getItem(table, { appId, id }, { client })
}

export const listDeployments = async (
	client: DynamoDBClient,
	appId: string,
	branch?: string
): Promise<Deployment[]> => {
	const items: Deployment[] = []
	let cursor: string | undefined

	do {
		let result
		try {
			result = await query(
				table,
				{ appId },
				{
					where: branch ? e => e.id.startsWith(`${branch}-`) : undefined,
					consistentRead: true,
					limit: 100,
					cursor,
					client,
				}
			)
		} catch (error) {
			// The manifest table only exists after the first deploy.
			if (isError(error, 'ResourceNotFoundException')) {
				return []
			}

			throw error
		}
		items.push(...result.items)
		cursor = result.cursor
	} while (cursor)

	// The id prefix also matches longer branch names like '<branch>-2'.
	return items
		.filter(item => !branch || item.branch === branch)
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const markDeployed = async (props: {
	client: DynamoDBClient
	appId: string
	id: string
	functionVersion: string
}) => {
	await updateItem(
		table,
		{ appId: props.appId, id: props.id },
		{
			update: e => e.functionVersion.set(props.functionVersion),
			when: e => e.id.exists(),
			client: props.client,
		}
	)
}

const markPromoted = async (client: DynamoDBClient, appId: string, id: string) => {
	await updateItem(
		table,
		{ appId, id },
		{
			update: e => e.promotedAt.set(new Date().toISOString()),
			when: e => e.id.exists(),
			client,
		}
	)
}

export const removeDeployment = async (client: DynamoDBClient, appId: string, id: string) => {
	await deleteItem(table, { appId, id }, { client })
}

// ------------------------------------------------------------
// Pruning policy

export type PruneOptions = {
	branch?: string
	keep: number
	main: string
}

// A record without a function version is either still running or abandoned.
const BUSY_WINDOW_HOURS = 24

export const isDeploymentBusy = (item: Deployment, now = new Date()) => {
	return !item.functionVersion && isAfter(new Date(item.createdAt), subHours(now, BUSY_WINDOW_HOURS))
}

export const selectPrunableDeployments = (items: Deployment[], liveId: string | undefined, options: PruneOptions) => {
	// The live deployment & the newest other promoted deployment
	// always survive, so a rollback keeps a target.
	const rollbackTarget = items
		.filter(item => item.promotedAt && item.id !== liveId)
		.sort((a, b) => b.promotedAt!.localeCompare(a.promotedAt!))[0]

	const keep = Math.max(1, options.keep)
	const mainSlug = slugifyBranch(options.main)
	const keptMain = new Set(
		items
			.filter(item => item.branch === mainSlug && item.functionVersion)
			.map(item => item.seq)
			.sort((a, b) => b - a)
			.slice(0, keep)
	)
	return items.filter(item => {
		if (item.id === liveId || item.id === rollbackTarget?.id || isDeploymentBusy(item)) {
			return false
		}

		if (options.branch) {
			return item.branch === slugifyBranch(options.branch)
		}

		// deploys that never finished are abandoned after a day
		if (!item.functionVersion) {
			return true
		}

		if (item.branch === mainSlug) {
			return !keptMain.has(item.seq)
		}

		// branch deployments are prunable once their commit is merged
		return item.commit ? isCommitMerged(item.commit, options.main) : false
	})
}

export const pruneFunctionVersion = async (lambda: LambdaClient, functionName: string, version: string) => {
	// The remaining aliases of the version, like the hash named router
	// aliases, block its deletion & nothing else references them.
	for (const alias of await listLambdaAliases(lambda, functionName, version)) {
		if (alias.Name && alias.Name !== LIVE_LAMBDA_ALIAS) {
			await deleteLambdaAlias(lambda, functionName, alias.Name)
		}
	}

	try {
		await lambda.send(
			new DeleteFunctionCommand({
				FunctionName: functionName,
				Qualifier: version,
			})
		)
	} catch (error) {
		if (!isError(error, 'ResourceNotFoundException')) {
			throw error
		}
	}
}

// The function versions whose aliases reference neither a surviving
// deployment nor the live alias. Orphans without any alias are
// prunable as well.
export const selectPrunableVersions = async (props: {
	lambda: LambdaClient
	functionName: string
	survivingIds: Set<string>
}) => {
	const prunable: string[] = []

	for (const version of await listLambdaVersions(props.lambda, props.functionName)) {
		const aliases = await listLambdaAliases(props.lambda, props.functionName, version)
		const referenced = aliases.some(
			alias => alias.Name === LIVE_LAMBDA_ALIAS || (alias.Name && props.survivingIds.has(alias.Name))
		)

		if (!referenced) {
			prunable.push(version)
		}
	}

	return prunable
}

// ------------------------------------------------------------
// The live lambda alias points production at one function version &
// its description holds the deployment id that is live, since multiple
// deployments can share one function version. A stale or foreign
// description simply fails the manifest lookup.

export const readLiveDeploymentId = async (lambda: LambdaClient, functionName: string) => {
	return (await getLambdaAlias(lambda, functionName, LIVE_LAMBDA_ALIAS))?.Description || undefined
}

// ------------------------------------------------------------
// Deployment summary

type DeploymentState = Awaited<ReturnType<StateBackend['get']>>

const readStateNodes = (state: DeploymentState) => {
	const stacks = Object.values(state?.stacks ?? {}) as Array<{
		nodes: Record<string, { type: string; output: Record<string, string | undefined> }>
	}>

	return stacks.flatMap(stack => Object.entries(stack.nodes))
}

// The published version of every lambda in a deployment is part of
// the state, keyed by function name.
export const readDeployedFunctionVersions = (state: DeploymentState) => {
	const functions: Record<string, string> = {}

	for (const [, node] of readStateNodes(state)) {
		if (node.type !== 'aws_lambda_function') {
			continue
		}

		const { functionName, version, publish } = node.output

		if (publish && functionName && version && version !== '$LATEST') {
			functions[functionName] = version
		}
	}

	return functions
}

// ------------------------------------------------------------
// Promotion

type RouteStoreTarget = {
	arn: string
	deployment: StagedRouteDeployment
}

// The deployment that went live before the current one.
export const previousDeploymentId = async (props: {
	lambda: LambdaClient
	dynamo: DynamoDBClient
	appId: string
	functionName: string
}) => {
	const liveId = await readLiveDeploymentId(props.lambda, props.functionName)
	const previous =
		liveId &&
		(await listDeployments(props.dynamo, props.appId))
			.filter(item => item.promotedAt && item.functionVersion)
			.sort((a, b) => b.promotedAt!.localeCompare(a.promotedAt!))
			.find(item => item.id !== liveId)

	if (!previous) {
		throw new ExpectedError(`There is no previous deployment to rollback to.`)
	}

	return previous.id
}

// Reject deploys that were claimed before the live deployment was
// promoted, so a slow deploy can't stage itself over a newer release.
export const preflightDeployment = async (props: {
	lambda: LambdaClient
	dynamo: DynamoDBClient
	appId: string
	functionName: string
	deployment: Deployment
}) => {
	const liveId = await readLiveDeploymentId(props.lambda, props.functionName)
	const live = liveId ? await getDeployment(props.dynamo, props.appId, liveId) : undefined

	if (live?.promotedAt && live.promotedAt > props.deployment.createdAt) {
		throw new ExpectedError(`A newer deployment is already live.`)
	}
}

export const promoteDeployment = async (props: {
	kvs: CloudFrontKeyValueStoreClient
	lambda: LambdaClient
	dynamo: DynamoDBClient
	appId: string
	appName: string
	functionName: string
	id: string
	stores?: RouteStoreTarget[]
	rejectStale?: boolean
}) => {
	const stores = props.stores ?? []
	const deployment = await getDeployment(props.dynamo, props.appId, props.id)
	const functionVersion = deployment?.functionVersion

	if (!deployment) {
		throw new ExpectedError(`Deployment "${props.id}" doesn't exist.`)
	}

	if (!functionVersion) {
		throw new ExpectedError(`Deployment "${props.id}" hasn't finished deploying.`)
	}

	for (const store of stores) {
		if (store.deployment.functionVersion !== functionVersion) {
			throw new ExpectedError(`The routes don't share the deployed function version.`)
		}
	}

	const alias = await getLambdaAlias(props.lambda, props.functionName, LIVE_LAMBDA_ALIAS)
	const liveId = alias?.Description || undefined

	// The active routes of every store are read up front, so a failed
	// promotion can restore each store to what it served before.
	const activeRoutes = new Map<string, StagedRouteDeployment | undefined>()

	for (const store of stores) {
		const activeId = await readActiveDeploymentId(props.kvs, store.arn)
		const active = activeId !== undefined ? await readRouteDeployment(props.kvs, store.arn, activeId) : undefined

		activeRoutes.set(store.arn, active)
	}

	// The release lock is a TTL lease, so a stalled deploy can lose it mid-apply.
	if (props.rejectStale && liveId && liveId !== props.id) {
		const live = await getDeployment(props.dynamo, props.appId, liveId)

		if (live?.promotedAt && live.promotedAt > deployment.createdAt) {
			throw new ExpectedError(`A newer deployment is already live.`)
		}
	}

	try {
		await props.lambda.send(
			new GetFunctionCommand({
				FunctionName: props.functionName,
				Qualifier: functionVersion,
			})
		)
	} catch (error) {
		if (isError(error, 'ResourceNotFoundException')) {
			throw new ExpectedError(`The function version "${functionVersion}" of this deployment no longer exists.`)
		}

		throw error
	}

	let aliasUpdateStarted = false

	const flippedStores: RouteStoreTarget[] = []
	const flipped: { functionName: string; liveVersion?: string; liveDescription?: string }[] = []

	try {
		// The live aliases of the stand-alone lambdas flip first & the
		// bundle alias last, since the bundle is the async entry point.
		for (const name of await listLambdaFunctions(props.lambda, getAppNamePrefix(props.appName))) {
			if (name === props.functionName) {
				continue
			}

			const target = await getLambdaAlias(props.lambda, name, props.id)

			if (!target?.FunctionVersion) {
				continue
			}

			const current = await getLambdaAlias(props.lambda, name, LIVE_LAMBDA_ALIAS)

			if (current?.FunctionVersion === target.FunctionVersion && current?.Description === props.id) {
				continue
			}

			flipped.push({
				functionName: name,
				liveVersion: current?.FunctionVersion,
				liveDescription: current?.Description,
			})

			await upsertLambdaAlias(props.lambda, {
				functionName: name,
				functionVersion: target.FunctionVersion,
				name: LIVE_LAMBDA_ALIAS,
				description: props.id,
			})
		}

		for (const store of stores) {
			if (activeRoutes.get(store.arn)?.id !== store.deployment.id) {
				flippedStores.push(store)
				await setActiveRouteDeployment(props.kvs, store.arn, store.deployment)
			}
		}

		if (alias?.FunctionVersion !== functionVersion || alias?.Description !== props.id) {
			aliasUpdateStarted = true
			await upsertLambdaAlias(props.lambda, {
				functionName: props.functionName,
				functionVersion,
				name: LIVE_LAMBDA_ALIAS,
				description: props.id,
			})
		}

		// Record the promotion in the manifest last, so a failed write
		// rolls back the routes & alias with it.
		await markPromoted(props.dynamo, props.appId, props.id)
	} catch (error) {
		const rollback = [
			...flippedStores.map(store => setActiveRouteDeployment(props.kvs, store.arn, activeRoutes.get(store.arn))),
			...(aliasUpdateStarted && alias?.FunctionVersion
				? [
						upsertLambdaAlias(props.lambda, {
							functionName: props.functionName,
							functionVersion: alias.FunctionVersion,
							name: LIVE_LAMBDA_ALIAS,
							description: alias.Description ?? '',
						}),
					]
				: []),
			...flipped
				.filter(item => item.liveVersion)
				.map(item =>
					upsertLambdaAlias(props.lambda, {
						functionName: item.functionName,
						functionVersion: item.liveVersion!,
						name: LIVE_LAMBDA_ALIAS,
						description: item.liveDescription ?? '',
					})
				),
		]
		const failures = (await Promise.allSettled(rollback))
			.filter(result => result.status === 'rejected')
			.map(result => result.reason)

		if (failures.length > 0) {
			throw new AggregateError(
				[error, ...failures],
				`Deployment promotion failed and couldn't be fully reverted.`,
				{ cause: error }
			)
		}

		throw error
	}
}

const activateDeployment = async (props: { appConfig: AppConfig; id?: string; rejectStale?: boolean }) => {
	const region = props.appConfig.region
	const credentials = await getCredentials(props.appConfig.profile)
	const accountId = await getAccountId(credentials, region)
	const appId = generateGlobalAppId({ accountId, region, appName: props.appConfig.name })
	const cloudfront = new CloudFrontClient({ credentials, region: 'us-east-1' })
	const kvs = new CloudFrontKeyValueStoreClient({ credentials, region })
	const lambda = new LambdaClient({ credentials, region })
	const dynamo = new DynamoDBClient({ credentials, region })
	const functionName = getBundleFunctionName(props.appConfig.name)

	const id = props.id ?? (await previousDeploymentId({ lambda, dynamo, appId, functionName }))
	const stores: RouteStoreTarget[] = []

	for (const routerId of Object.keys(props.appConfig.router ?? {})) {
		const storeArn = await getRouteStoreArn(
			cloudfront,
			formatGlobalResourceName({
				appName: props.appConfig.name,
				resourceType: 'router',
				resourceName: routerId,
			})
		)

		if (!storeArn) {
			throw new ExpectedError(`The "${routerId}" router hasn't been deployed yet. Run "awsless deploy" first.`)
		}

		const routes = await readRouteDeployment(kvs, storeArn, id)

		if (!routes) {
			throw new ExpectedError(`Deployment "${id}" doesn't exist for the "${routerId}" router.`)
		}

		stores.push({ arn: storeArn, deployment: routes })
	}

	await promoteDeployment({
		kvs,
		lambda,
		dynamo,
		appId,
		appName: props.appConfig.name,
		functionName,
		id,
		stores,
		rejectStale: props.rejectStale,
	})

	return id
}

// The caller must hold the app release lock.
export const promoteAppDeployment = (props: { appConfig: AppConfig; id: string }) => {
	return activateDeployment({ ...props, rejectStale: true })
}

export const rollbackAppDeployment = (props: { appConfig: AppConfig; id?: string }) => {
	return withAppReleaseLock(props.appConfig, () => activateDeployment(props))
}

export const withAppReleaseLock = async <T>(appConfig: AppConfig, callback: () => Promise<T>) => {
	const credentials = await getCredentials(appConfig.profile)
	const accountId = await getAccountId(credentials, appConfig.region)
	const { lock } = createDeploymentBackends({ credentials, accountId, region: appConfig.region })
	const appId = generateGlobalAppId({ accountId, region: appConfig.region, appName: appConfig.name })
	const release = await lock.lock(getAppReleaseLockUrn(appId))

	try {
		return await callback()
	} finally {
		await release()
	}
}
