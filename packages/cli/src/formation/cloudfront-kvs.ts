import { createHash } from 'node:crypto'
import { CloudFrontClient, DescribeKeyValueStoreCommand } from '@aws-sdk/client-cloudfront'
import {
	CloudFrontKeyValueStoreClient,
	DescribeKeyValueStoreCommand as DescribeDataStoreCommand,
	GetKeyCommand,
	ListKeysCommand,
	UpdateKeysCommand,
} from '@aws-sdk/client-cloudfront-keyvaluestore'
import { createCustomProvider, createCustomResourceClass, Input } from '@terraforge/core'
import chunk from 'chunk'
import { z } from 'zod'
import { Region } from '../config/schema/region'
import { Credentials, isError } from '../util/aws'

import '@aws-sdk/signature-v4-crt'

// ------------------------------------------------------------
// Each router keeps its staged route tables and active pointer in one store:
//
//   <table>:<route>   route table, stored once per content version
//   $deploy:<id>      'table:functionVersion', one entry per deployment
//   $active           'table:id', what production serves, the switch

const ACTIVE_KEY = '$active'
const DEPLOY_KEY_PREFIX = '$deploy:'

const routeSchema = z.object({
	key: z.string(),
	value: z.string(),
})

type RouteEntry = z.output<typeof routeSchema>

type Mutation =
	| {
			type: 'put'
			key: string
			value: string
	  }
	| {
			type: 'delete'
			key: string
	  }

export type StagedRouteDeployment = {
	id: string
	table: string
	functionVersion: string
}

type RouteDeploymentInput = {
	deploymentId: Input<string>
	storeArn: Input<string>
	routes: Input<RouteEntry[]>
	functionVersion: Input<string>
}

export const RouteDeployment = createCustomResourceClass<RouteDeploymentInput, {}>('cloudfront-kvs', 'route-deployment')

const routeDeploymentInputSchema = z.object({
	deploymentId: z.string(),
	storeArn: z.string(),
	routes: z.array(routeSchema),
	functionVersion: z.string(),
})

// store values are plain '<table>:<id or version>' pairs
const parseValue = (value: string | undefined): [string, string] | undefined => {
	const parts = value?.split(':')

	return parts?.length === 2 && parts[0] && parts[1] ? (parts as [string, string]) : undefined
}

// ------------------------------------------------------------
// Planning

// Route keys are unique by construction, so the key alone sorts deterministically.
const sortRoutes = (routes: RouteEntry[]) => {
	return [...routes].toSorted((a, b) => (a.key < b.key ? -1 : 1))
}

const getRouteTableId = (routes: RouteEntry[]) => {
	return createHash('sha1').update(JSON.stringify(routes)).digest('hex').slice(0, 8)
}

// ------------------------------------------------------------
// Store access

const getStoreValue = async (kvs: CloudFrontKeyValueStoreClient, storeArn: string, key: string) => {
	try {
		const result = await kvs.send(new GetKeyCommand({ KvsARN: storeArn, Key: key }))

		return result.Value
	} catch (error) {
		if (!isError(error, 'ResourceNotFoundException')) {
			throw error
		}

		return
	}
}

const updateKeys = async (kvs: CloudFrontKeyValueStoreClient, props: { storeArn: string; mutations: Mutation[] }) => {
	let etag = (await kvs.send(new DescribeDataStoreCommand({ KvsARN: props.storeArn }))).ETag

	for (const mutations of chunk(props.mutations, 50)) {
		if (mutations.length === 0) {
			continue
		}

		const result = await kvs.send(
			new UpdateKeysCommand({
				KvsARN: props.storeArn,
				IfMatch: etag,
				Puts: mutations.filter(item => item.type === 'put').map(item => ({ Key: item.key, Value: item.value })),
				Deletes: mutations.filter(item => item.type === 'delete').map(item => ({ Key: item.key })),
			})
		)
		etag = result.ETag
	}
}

export const readRouteDeployment = async (
	kvs: CloudFrontKeyValueStoreClient,
	storeArn: string,
	deploymentId: string
): Promise<StagedRouteDeployment | undefined> => {
	const value = parseValue(await getStoreValue(kvs, storeArn, `${DEPLOY_KEY_PREFIX}${deploymentId}`))

	return value ? { id: deploymentId, table: value[0], functionVersion: value[1] } : undefined
}

export const readActiveDeploymentId = async (kvs: CloudFrontKeyValueStoreClient, storeArn: string) => {
	return parseValue(await getStoreValue(kvs, storeArn, ACTIVE_KEY))?.[1]
}

// resolve the store of a router by its deterministic name
export const getRouteStoreArn = async (cloudfront: CloudFrontClient, name: string) => {
	try {
		const result = await cloudfront.send(new DescribeKeyValueStoreCommand({ Name: name }))

		return result.KeyValueStore?.ARN
	} catch (error) {
		if (!isError(error, 'EntityNotFound') && !isError(error, 'NoSuchResource')) {
			throw error
		}

		return
	}
}

// ------------------------------------------------------------
// Staging

const stageRoutes = async (kvs: CloudFrontKeyValueStoreClient, state: z.output<typeof routeDeploymentInputSchema>) => {
	const routes = sortRoutes(state.routes)
	const table = getRouteTableId(routes)

	const mutations: Mutation[] = [
		...routes.map((route): Mutation => ({
			type: 'put',
			key: `${table}:${route.key}`,
			value: route.value,
		})),
		{
			type: 'put',
			key: `${DEPLOY_KEY_PREFIX}${state.deploymentId}`,
			value: `${table}:${state.functionVersion}`,
		},
	]

	// Route rows are written before the mapping, so an interrupted upload
	// can't be selected by a promotion.
	// Promotion changes $active only after the full app deployment succeeds.
	await updateKeys(kvs, {
		storeArn: state.storeArn,
		mutations,
	})

	return {
		...state,
		routes,
	}
}

type ProviderProps = {
	credentials: Credentials
	region: Region
}

export const createCloudFrontKvsProvider = ({ credentials, region }: ProviderProps) => {
	const kvs = new CloudFrontKeyValueStoreClient({ credentials, region })

	return createCustomProvider('cloudfront-kvs', {
		// Backwards compatibility for old states, can be removed later.
		'import-keys': {},
		'route-deployment': {
			async createResource(props) {
				return stageRoutes(kvs, routeDeploymentInputSchema.parse(props.state))
			},
			async updateResource(props) {
				return stageRoutes(kvs, routeDeploymentInputSchema.parse(props.proposedState))
			},
		},
	})
}

// ------------------------------------------------------------
// CLI

export const setActiveRouteDeployment = async (
	kvs: CloudFrontKeyValueStoreClient,
	storeArn: string,
	deployment?: StagedRouteDeployment
) => {
	await updateKeys(kvs, {
		storeArn,
		mutations: deployment
			? [{ type: 'put', key: ACTIVE_KEY, value: `${deployment.table}:${deployment.id}` }]
			: [{ type: 'delete', key: ACTIVE_KEY }],
	})
}

// Drop the pruned deployments & every route table that no remaining
// deployment or the active pointer references.
export const pruneStoreDeployments = async (
	kvs: CloudFrontKeyValueStoreClient,
	storeArn: string,
	deploymentIds: string[]
) => {
	await updateKeys(kvs, {
		storeArn,
		mutations: deploymentIds.map(id => ({ type: 'delete', key: `${DEPLOY_KEY_PREFIX}${id}` })),
	})

	const keys: RouteEntry[] = []
	let nextToken: string | undefined

	do {
		const page = await kvs.send(new ListKeysCommand({ KvsARN: storeArn, NextToken: nextToken }))
		nextToken = page.NextToken
		keys.push(...(page.Items ?? []).map(item => ({ key: item.Key!, value: item.Value! })))
	} while (nextToken)

	const referenced = new Set(
		keys
			.filter(entry => entry.key.startsWith(DEPLOY_KEY_PREFIX) || entry.key === ACTIVE_KEY)
			.map(entry => entry.value.split(':')[0])
	)
	const orphans = keys.filter(entry => !entry.key.startsWith('$') && !referenced.has(entry.key.split(':')[0]))

	await updateKeys(kvs, {
		storeArn,
		mutations: orphans.map(entry => ({ type: 'delete', key: entry.key })),
	})

	// The surviving route values tell the caller which assets are still referenced.
	return keys
		.filter(entry => !entry.key.startsWith('$') && referenced.has(entry.key.split(':')[0]))
		.map(entry => entry.value)
}
