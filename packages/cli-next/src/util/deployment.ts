import { CloudFrontClient } from '@aws-sdk/client-cloudfront'
import { CloudFrontKeyValueStoreClient } from '@aws-sdk/client-cloudfront-keyvaluestore'
import { GetAliasCommand, GetFunctionCommand, LambdaClient, ListAliasesCommand } from '@aws-sdk/client-lambda'
import { define, DynamoDBClient, number, object, string, updateItem } from '@awsless/dynamodb'
import { App, StateBackend } from '@terraforge/core'
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
import {
	deleteAlias,
	getAlias,
	getDeploymentAliasName,
	LIVE_ALIAS,
	parseDeploymentAliasName,
	upsertAlias,
} from './lambda.js'
import { formatGlobalResourceName, generateGlobalAppId, getBundleFunctionName } from './name.js'
import { createDeploymentBackends, getAppReleaseLockUrn } from './workspace.js'

type RouterTarget = {
	id: string
	storeArn: string
	deployment: RouteDeployment
}

const descriptionPattern = /^\$awsless:deployment:(\d+):(\d+)$/
const promotedDescription = '$awsless:promoted'

const parseDeploymentDescription = (description?: string) => {
	const match = description?.match(descriptionPattern)

	return match
		? {
				active: Number(match[1]),
				latest: Number(match[2]),
			}
		: undefined
}

const formatDeploymentDescription = (active: number, latest: number) => {
	return `$awsless:deployment:${active}:${latest}`
}

export const formatDeploymentSummary = (props: {
	state: Awaited<ReturnType<StateBackend['get']>>
	appConfig: AppConfig
	deploymentId: number
}): string[] => {
	const previewUrls = new Map<string, string>()
	const stacks = Object.values(props.state?.stacks ?? {}) as Array<{
		nodes: Record<string, { type: string; output: { domainName?: string } }>
	}>

	for (const stack of stacks) {
		for (const [urn, node] of Object.entries(stack.nodes)) {
			if (node.type === 'aws_cloudfront_distribution' && urn.endsWith(':{preview}')) {
				const routerId = urn.match(/:router:\{([^}]+)\}/)?.[1]
				if (routerId) {
					previewUrls.set(routerId, `https://${node.output.domainName}`)
				}
			}
		}
	}

	const deploymentDomain = props.appConfig.defaults.deploymentDomain

	return Object.keys(props.appConfig.defaults.router ?? {}).map(routerId => {
		return [
			`${routerId}: deployment #${props.deploymentId}`,
			deploymentDomain && `https://${routerId}-${props.deploymentId}.${deploymentDomain}`,
			previewUrls.get(routerId),
		]
			.filter(Boolean)
			.join('\n')
	})
}

export const readFunctionDeployment = async (props: {
	lambda: LambdaClient
	functionName: string
	deploymentId?: number
}) => {
	if (props.deploymentId !== undefined) {
		try {
			const alias = await props.lambda.send(
				new GetAliasCommand({
					FunctionName: props.functionName,
					Name: getDeploymentAliasName(props.deploymentId),
				})
			)

			return {
				id: props.deploymentId,
				functionVersion: alias.FunctionVersion!,
			}
		} catch (error) {
			if (isError(error, 'ResourceNotFoundException')) {
				throw new ExpectedError(`Deployment "${props.deploymentId}" doesn't exist.`)
			}

			throw error
		}
	}

	let live

	try {
		live = await props.lambda.send(
			new GetAliasCommand({
				FunctionName: props.functionName,
				Name: LIVE_ALIAS,
			})
		)
	} catch (error) {
		if (isError(error, 'ResourceNotFoundException')) {
			throw new ExpectedError(`There is no previous deployment to rollback to.`)
		}

		throw error
	}

	const active = parseDeploymentDescription(live.Description)?.active
	let nextToken: string | undefined
	let previous:
		| {
				id: number
				functionVersion: string
		  }
		| undefined

	if (active !== undefined) {
		do {
			const page = await props.lambda.send(
				new ListAliasesCommand({
					FunctionName: props.functionName,
					Marker: nextToken,
				})
			)
			nextToken = page.NextMarker

			for (const alias of page.Aliases ?? []) {
				const id = alias.Name ? parseDeploymentAliasName(alias.Name) : undefined

				if (
					id !== undefined &&
					id < active &&
					(!previous || id > previous.id) &&
					alias.FunctionVersion &&
					alias.Description === promotedDescription
				) {
					previous = {
						id,
						functionVersion: alias.FunctionVersion,
					}
				}
			}
		} while (nextToken)
	}

	if (!previous) {
		throw new ExpectedError(`There is no previous deployment to rollback to.`)
	}

	return previous
}

export const preflightDeployment = async (props: {
	lambda: LambdaClient
	functionName: string
	deploymentId: number
}) => {
	const live = await getAlias(props.lambda, props.functionName, LIVE_ALIAS)
	const latest = parseDeploymentDescription(live?.Description)?.latest

	if (latest !== undefined && latest > props.deploymentId) {
		throw new ExpectedError(`A newer deployment is already live.`)
	}
}

export const promoteDeployment = async (props: {
	kvs: CloudFrontKeyValueStoreClient
	lambda: LambdaClient
	functionName: string
	deploymentId: number
	functionVersion: string
	routers: RouterTarget[]
	rejectStale?: boolean
}) => {
	if (props.routers.some(router => router.deployment.functionVersion !== props.functionVersion)) {
		throw new ExpectedError(`The routers don't share the deployed function version.`)
	}

	const alias = await getAlias(props.lambda, props.functionName, LIVE_ALIAS)
	const aliasDeployment = parseDeploymentDescription(alias?.Description)
	const active = await Promise.all(
		props.routers.map(async router => {
			const activeId = await readActiveDeploymentId(props.kvs, router.storeArn)

			return {
				...router,
				active:
					activeId === undefined
						? undefined
						: await readRouteDeployment(props.kvs, router.storeArn, activeId),
			}
		})
	)
	const activeIds = new Set(active.map(router => router.active?.id).filter(id => id !== undefined))
	const activeVersions = new Set(
		active.map(router => router.active?.functionVersion).filter(version => version !== undefined)
	)

	if (
		props.rejectStale &&
		Math.max(aliasDeployment?.latest ?? 0, ...active.map(router => router.active?.id ?? 0)) > props.deploymentId
	) {
		throw new ExpectedError(`A newer deployment is already live.`)
	}

	try {
		await props.lambda.send(
			new GetFunctionCommand({
				FunctionName: props.functionName,
				Qualifier: props.functionVersion,
			})
		)
	} catch (error) {
		if (isError(error, 'ResourceNotFoundException')) {
			throw new ExpectedError(`The function version "${props.functionVersion}" of this deployment no longer exists.`)
		}

		throw error
	}

	const changed: typeof active = []
	let aliasUpdateStarted = false
	let deploymentUpdateStarted = false
	const description = formatDeploymentDescription(
		props.deploymentId,
		Math.max(props.deploymentId, aliasDeployment?.latest ?? 0, ...active.map(router => router.active?.id ?? 0))
	)
	const priorId = activeIds.size === 1 ? [...activeIds][0] : undefined
	const priorVersion = activeVersions.size === 1 ? [...activeVersions][0] : undefined

	if (priorId !== undefined && priorVersion !== undefined && priorVersion === alias?.FunctionVersion) {
		const priorAlias = await getAlias(props.lambda, props.functionName, getDeploymentAliasName(priorId))

		if (priorAlias?.FunctionVersion !== priorVersion || priorAlias?.Description !== promotedDescription) {
			await upsertAlias(props.lambda, {
				functionName: props.functionName,
				functionVersion: priorVersion,
				name: getDeploymentAliasName(priorId),
				description: promotedDescription,
			})
		}
	}

	const deploymentAlias = await getAlias(
		props.lambda,
		props.functionName,
		getDeploymentAliasName(props.deploymentId)
	)

	try {
		for (const router of active) {
			if (router.active?.id !== router.deployment.id) {
				changed.push(router)
				await setActiveRouteDeployment(props.kvs, router.storeArn, router.deployment)
			}
		}

		if (alias?.FunctionVersion !== props.functionVersion || alias?.Description !== description) {
			aliasUpdateStarted = true
			await upsertAlias(props.lambda, {
				functionName: props.functionName,
				functionVersion: props.functionVersion,
				name: LIVE_ALIAS,
				description,
			})
		}

		if (
			deploymentAlias?.FunctionVersion !== props.functionVersion ||
			deploymentAlias.Description !== promotedDescription
		) {
			deploymentUpdateStarted = true
			await upsertAlias(props.lambda, {
				functionName: props.functionName,
				functionVersion: props.functionVersion,
				name: getDeploymentAliasName(props.deploymentId),
				description: promotedDescription,
			})
		}
	} catch (error) {
		const rollback = [
			...changed.reverse().map(router => setActiveRouteDeployment(props.kvs, router.storeArn, router.active)),
			...(deploymentUpdateStarted && deploymentAlias?.FunctionVersion
				? [
						upsertAlias(props.lambda, {
							functionName: props.functionName,
							functionVersion: deploymentAlias.FunctionVersion,
							name: getDeploymentAliasName(props.deploymentId),
							description: deploymentAlias.Description ?? '',
						}),
					]
				: deploymentUpdateStarted
					? [deleteAlias(props.lambda, props.functionName, getDeploymentAliasName(props.deploymentId))]
					: []),
			...(aliasUpdateStarted && alias?.FunctionVersion
				? [
						upsertAlias(props.lambda, {
							functionName: props.functionName,
							functionVersion: alias.FunctionVersion,
							name: LIVE_ALIAS,
							description: alias.Description ?? '',
						}),
					]
				: aliasUpdateStarted
					? [deleteAlias(props.lambda, props.functionName, LIVE_ALIAS)]
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

const updateDeployment = async (props: {
	appConfig: AppConfig
	deploymentId?: number
	rejectStale?: boolean
}) => {
	const region = props.appConfig.region
	const credentials = await getCredentials(props.appConfig.profile)
	const accountId = await getAccountId(credentials, region)
	const app = new App(props.appConfig.name)
	const cloudfront = new CloudFrontClient({ credentials, region: 'us-east-1' })
	const kvs = new CloudFrontKeyValueStoreClient({ credentials, region })
	const lambda = new LambdaClient({ credentials, region })
	const functionName = getBundleFunctionName(props.appConfig.name)
	const { lock } = createDeploymentBackends({ credentials, accountId, region })
	const release = await lock.lock(app.urn)

	try {
		const routers: RouterTarget[] = []
		let deploymentId = props.deploymentId
		let functionVersion: string | undefined
		const routerIds = Object.keys(props.appConfig.defaults.router ?? {})

		if (props.rejectStale || deploymentId === undefined || routerIds.length === 0) {
			const deployment = await readFunctionDeployment({
				lambda,
				functionName,
				deploymentId,
			})
			deploymentId = deployment.id
			functionVersion = deployment.functionVersion
		}

		for (const id of routerIds) {
			const storeArn = await getRouteStoreArn(
				cloudfront,
				formatGlobalResourceName({
					appName: props.appConfig.name,
					resourceType: 'router',
					resourceName: id,
				})
			)

			if (!storeArn) {
				throw new ExpectedError(`The "${id}" router hasn't been deployed yet. Run "awsless deploy" first.`)
			}

			const deployment = await readRouteDeployment(kvs, storeArn, deploymentId!)

			if (!deployment) {
				throw new ExpectedError(`Deployment "${deploymentId}" doesn't exist for every router.`)
			}

			routers.push({ id, storeArn, deployment })
		}

		const deploymentIds = new Set(routers.map(router => router.deployment.id))
		const functionVersions = new Set(routers.map(router => router.deployment.functionVersion))

		if (deploymentIds.size > 1) {
			throw new ExpectedError(`The routers don't share one deployment.`)
		}

		if (functionVersions.size > 1) {
			throw new ExpectedError(`The routers don't share one function version.`)
		}

		deploymentId ??= routers[0]!.deployment.id
		functionVersion ??= routers[0]!.deployment.functionVersion

		await promoteDeployment({
			kvs,
			lambda,
			functionName,
			deploymentId,
			functionVersion,
			routers,
			rejectStale: props.rejectStale,
		})

		return deploymentId
	} finally {
		await release()
	}
}

// The caller must hold the app release lock.
export const promoteAppDeployment = (props: {
	appConfig: AppConfig
	deploymentId: number
}) => {
	return updateDeployment({ ...props, rejectStale: true })
}

export const rollbackAppDeployment = (props: { appConfig: AppConfig; deploymentId?: number }) => {
	return withAppReleaseLock(props.appConfig, () => updateDeployment(props))
}

export const nextDeploymentId = async (client: DynamoDBClient, appId: string) => {
	const sequences = define('awsless-locks', {
		hash: 'urn',
		schema: object({
			urn: string(),
			version: number(),
		}),
	})

	const result = await updateItem(
		sequences,
		{ urn: `urn:deployment-seq:${appId}` },
		{
			update: e => e.version.incr(1),
			return: 'ALL_NEW',
			client,
		}
	)

	return result.version
}

const withAppReleaseLock = async <T>(appConfig: AppConfig, callback: () => Promise<T>) => {
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
