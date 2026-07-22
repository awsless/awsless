import { CloudFrontClient } from '@aws-sdk/client-cloudfront'
import { CloudFrontKeyValueStoreClient } from '@aws-sdk/client-cloudfront-keyvaluestore'
import { GetFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda'
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
import { execSync } from 'node:child_process'
import { userInfo } from 'node:os'
import { AppConfig } from '../config/app.js'
import { ExpectedError } from '../error.js'
import {
	getRouteStoreArn,
	readActiveDeploymentId,
	readRouteDeployment,
	RouteDeployment,
	setActiveRouteDeployment,
} from '../formation/cloudfront-kvs.js'
import { getAccountId, getCredentials, isError } from './aws.js'
import { getLambdaAlias, LIVE_LAMBDA_ALIAS, upsertLambdaAlias } from './lambda.js'
import { formatGlobalResourceName, generateGlobalAppId, getBundleFunctionName } from './name.js'
import { createDeploymentBackends, getAppReleaseLockUrn } from './workspace.js'

// ------------------------------------------------------------
// A deployment id is a counter per git branch formatted as
// '<branch>-<seq>'. The one string is the manifest sort key, the
// deployment alias suffix, the route store key & the id users see.

// Lambda alias names only allow [a-zA-Z0-9-_].
export const slugifyBranch = (branch?: string) => {
	return (
		(branch ?? '')
			.replace(/[^a-zA-Z0-9_-]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'local'
	)
}

// ------------------------------------------------------------
// Git

const git = (command: string) => {
	try {
		return execSync(`git ${command}`, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim()
	} catch {
		return
	}
}

export const isCommitMerged = (commit: string, branch: string) => {
	return git(`merge-base --is-ancestor ${JSON.stringify(commit)} ${JSON.stringify(branch)}`) !== undefined
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

	return items.reduce<Deployment | undefined>((latest, item) => ((latest?.seq ?? 0) >= item.seq ? latest : item), undefined)
}

export const claimDeployment = async (props: { client: DynamoDBClient; appId: string }): Promise<Deployment> => {
	const branch = slugifyBranch(git('rev-parse --abbrev-ref HEAD'))

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
			commit: git('rev-parse HEAD'),
			message: git('log -1 --pretty=%s'),
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
	return latestBranchDeployment(client, appId, slugifyBranch(git('rev-parse --abbrev-ref HEAD')))
}

export const getDeployment = async (client: DynamoDBClient, appId: string, id: string) => {
	return getItem(table, { appId, id }, { client })
}

export const listDeployments = async (client: DynamoDBClient, appId: string, branch?: string): Promise<Deployment[]> => {
	const items: Deployment[] = []
	let cursor: string | undefined

	do {
		const result = await query(
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

// The published function version of a deployment is part of the state.
export const readDeployedFunctionVersion = (state: DeploymentState) => {
	for (const [, node] of readStateNodes(state)) {
		if (node.type === 'bundle-deployment') {
			return node.output.functionVersion
		}
	}

	return
}

export const formatDeploymentSummary = (props: {
	state: DeploymentState
	appConfig: AppConfig
	id: string
}): string[] => {
	const previewUrls = new Map<string, string>()

	for (const [urn, node] of readStateNodes(props.state)) {
		if (node.type === 'aws_cloudfront_distribution' && urn.endsWith(':{preview}')) {
			const router = urn.match(/router:\{([^}]+)\}/)?.[1]

			if (router) {
				previewUrls.set(router, `https://${node.output.domainName}`)
			}
		}
	}

	// Every router has its own preview host: the plain host previews the
	// live deployment, and the awsless-deployment query selects this
	// deployment through the same router function.
	return Object.keys(props.appConfig.defaults.router ?? {}).map(routerId => {
		const previewUrl = previewUrls.get(routerId)

		return [
			`${routerId}: deployment #${props.id}`,
			previewUrl,
			previewUrl ? `${previewUrl}/?awsless-deployment=${props.id}` : undefined,
		]
			.filter(Boolean)
			.join('\n')
	})
}

// ------------------------------------------------------------
// Promotion

type RouteStoreTarget = {
	arn: string
	deployment: RouteDeployment
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
	functionName: string
	id: string
	store?: RouteStoreTarget
	rejectStale?: boolean
}) => {
	const deployment = await getDeployment(props.dynamo, props.appId, props.id)
	const functionVersion = deployment?.functionVersion

	if (!deployment || !functionVersion) {
		throw new ExpectedError(`Deployment "${props.id}" doesn't exist.`)
	}

	if (props.store && props.store.deployment.functionVersion !== functionVersion) {
		throw new ExpectedError(`The routes don't share the deployed function version.`)
	}

	const alias = await getLambdaAlias(props.lambda, props.functionName, LIVE_LAMBDA_ALIAS)
	const liveId = await readLiveDeploymentId(props.lambda, props.functionName)
	const activeId = props.store ? await readActiveDeploymentId(props.kvs, props.store.arn) : undefined
	const active =
		props.store && activeId !== undefined
			? await readRouteDeployment(props.kvs, props.store.arn, activeId)
			: undefined

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

	let routesUpdateStarted = false
	let aliasUpdateStarted = false

	try {
		if (props.store && active?.id !== props.store.deployment.id) {
			routesUpdateStarted = true
			await setActiveRouteDeployment(props.kvs, props.store.arn, props.store.deployment)
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
			...(routesUpdateStarted && props.store
				? [setActiveRouteDeployment(props.kvs, props.store.arn, active)]
				: []),
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
		]
		const failures = (await Promise.allSettled(rollback))
			.filter(result => result.status === 'rejected')
			.map(result => result.reason)

		if (failures.length > 0) {
			throw new AggregateError([error, ...failures], `Deployment promotion failed and couldn't be fully reverted.`)
		}

		throw error
	}
}

const activateDeployment = async (props: {
	appConfig: AppConfig
	id?: string
	rejectStale?: boolean
}) => {
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
	let store: RouteStoreTarget | undefined

	if (Object.keys(props.appConfig.defaults.router ?? {}).length > 0) {
		const storeArn = await getRouteStoreArn(
			cloudfront,
			formatGlobalResourceName({
				appName: props.appConfig.name,
				resourceType: 'router',
				resourceName: 'store',
			})
		)

		if (!storeArn) {
			throw new ExpectedError(`The router hasn't been deployed yet. Run "awsless deploy" first.`)
		}

		const routes = await readRouteDeployment(kvs, storeArn, id)

		if (!routes) {
			throw new ExpectedError(`Deployment "${id}" doesn't exist.`)
		}

		store = { arn: storeArn, deployment: routes }
	}

	await promoteDeployment({
		kvs,
		lambda,
		dynamo,
		appId,
		functionName,
		id,
		store,
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
