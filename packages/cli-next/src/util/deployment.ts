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

type RouteStoreTarget = {
	arn: string
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
	let previewUrl: string | undefined
	const stacks = Object.values(props.state?.stacks ?? {}) as Array<{
		nodes: Record<string, { type: string; output: { domainName?: string } }>
	}>

	for (const stack of stacks) {
		for (const [urn, node] of Object.entries(stack.nodes)) {
			if (node.type === 'aws_cloudfront_distribution' && urn.endsWith(':{preview}')) {
				previewUrl = `https://${node.output.domainName}`
			}
		}
	}

	const deploymentDomain = props.appConfig.defaults.deploymentDomain

	// The preview distribution's own host serves the first router.
	return Object.keys(props.appConfig.defaults.router ?? {}).map((routerId, index) => {
		return [
			`${routerId}: deployment #${props.deploymentId}`,
			deploymentDomain && `https://${routerId}-${props.deploymentId}.${deploymentDomain}`,
			index === 0 ? previewUrl : undefined,
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
	store?: RouteStoreTarget
	rejectStale?: boolean
}) => {
	if (props.store && props.store.deployment.functionVersion !== props.functionVersion) {
		throw new ExpectedError(`The routes don't share the deployed function version.`)
	}

	const alias = await getAlias(props.lambda, props.functionName, LIVE_ALIAS)
	const aliasDeployment = parseDeploymentDescription(alias?.Description)
	const activeId = props.store ? await readActiveDeploymentId(props.kvs, props.store.arn) : undefined
	const active =
		props.store && activeId !== undefined
			? await readRouteDeployment(props.kvs, props.store.arn, activeId)
			: undefined

	if (
		props.rejectStale &&
		Math.max(aliasDeployment?.latest ?? 0, active?.id ?? 0) > props.deploymentId
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

	let routesUpdateStarted = false
	let aliasUpdateStarted = false
	let deploymentUpdateStarted = false
	const description = formatDeploymentDescription(
		props.deploymentId,
		Math.max(props.deploymentId, aliasDeployment?.latest ?? 0, active?.id ?? 0)
	)
	const priorId = active?.id
	const priorVersion = active?.functionVersion

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
		if (props.store && active?.id !== props.store.deployment.id) {
			routesUpdateStarted = true
			await setActiveRouteDeployment(props.kvs, props.store.arn, props.store.deployment)
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
			...(routesUpdateStarted && props.store
				? [setActiveRouteDeployment(props.kvs, props.store.arn, active)]
				: []),
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

const activateDeployment = async (props: {
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
		let deploymentId = props.deploymentId
		let functionVersion: string | undefined
		let store: RouteStoreTarget | undefined
		const hasRouter = Object.keys(props.appConfig.defaults.router ?? {}).length > 0

		if (props.rejectStale || deploymentId === undefined || !hasRouter) {
			const deployment = await readFunctionDeployment({
				lambda,
				functionName,
				deploymentId,
			})
			deploymentId = deployment.id
			functionVersion = deployment.functionVersion
		}

		if (hasRouter) {
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

			const deployment = await readRouteDeployment(kvs, storeArn, deploymentId!)

			if (!deployment) {
				throw new ExpectedError(`Deployment "${deploymentId}" doesn't exist.`)
			}

			store = { arn: storeArn, deployment }
			functionVersion ??= deployment.functionVersion
		}

		await promoteDeployment({
			kvs,
			lambda,
			functionName,
			deploymentId: deploymentId!,
			functionVersion: functionVersion!,
			store,
			rejectStale: props.rejectStale,
		})

		return deploymentId!
	} finally {
		await release()
	}
}

// The caller must hold the app release lock.
export const promoteAppDeployment = (props: {
	appConfig: AppConfig
	deploymentId: number
}) => {
	return activateDeployment({ ...props, rejectStale: true })
}

export const rollbackAppDeployment = (props: { appConfig: AppConfig; deploymentId?: number }) => {
	return withAppReleaseLock(props.appConfig, () => activateDeployment(props))
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
