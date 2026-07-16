import { CloudFrontClient, DescribeKeyValueStoreCommand } from '@aws-sdk/client-cloudfront'
import {
	CloudFrontKeyValueStoreClient,
	DescribeKeyValueStoreCommand as DescribeDataStoreCommand,
	GetKeyCommand,
	UpdateKeysCommand,
} from '@aws-sdk/client-cloudfront-keyvaluestore'
import { createCustomProvider, createCustomResourceClass, Input } from '@terraforge/core'
import chunk from 'chunk'
import { createHash } from 'node:crypto'
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
//
// The Lambda deployment aliases record which staged deployments were promoted.

const ACTIVE_KEY = '$active'
const DEPLOY_KEY_PREFIX = '$deploy:'

const routeSchema = z.object({
	key: z.string(),
	value: z.string(),
})

type Route = z.output<typeof routeSchema>

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

export type RouteDeployment = {
	id: number
	table: string
	functionVersion: string
}

type RouteDeploymentInput = {
	deploymentId: Input<number>
	storeArn: Input<string>
	routes: Input<Route[]>
	functionVersion: Input<string>
}

export const RouteDeployment = createCustomResourceClass<RouteDeploymentInput, {}>('cloudfront-kvs', 'route-deployment')

const routeDeploymentInputSchema = z.object({
	deploymentId: z.number(),
	storeArn: z.string(),
	routes: z.array(routeSchema),
	functionVersion: z.string(),
})

// store values are plain '<table>:<id or version>' pairs; anything else
// is garbage written by an older version of awsless
const parseValue = (value: string | undefined): [string, string] | undefined => {
	const parts = value?.split(':')

	return parts?.length === 2 && /^[0-9a-f]{8}$/.test(parts[0]!) && parts[1] ? (parts as [string, string]) : undefined
}

// ------------------------------------------------------------
// Planning

const sortRoutes = (routes: Route[]) => {
	return [...routes].sort((a, b) => {
		if (a.key === b.key) {
			return a.value < b.value ? -1 : a.value > b.value ? 1 : 0
		}

		return a.key < b.key ? -1 : 1
	})
}

const getRouteTableId = (routes: Route[]) => {
	return createHash('sha1').update(JSON.stringify(routes)).digest('hex').slice(0, 8)
}

const getTableMutations = (table: string, routes: Route[]): Mutation[] => {
	return routes.map(route => ({
		type: 'put',
		key: `${table}:${route.key}`,
		value: route.value,
	}))
}

const getActivateMutation = (deployment: RouteDeployment): Mutation => ({
	type: 'put',
	key: ACTIVE_KEY,
	value: `${deployment.table}:${deployment.id}`,
})

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

const updateKeys = async (
	kvs: CloudFrontKeyValueStoreClient,
	props: { storeArn: string; mutations: Mutation[] }
) => {
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
	deploymentId: number
): Promise<RouteDeployment | undefined> => {
	const value = parseValue(await getStoreValue(kvs, storeArn, `${DEPLOY_KEY_PREFIX}${deploymentId}`))

	return value ? { id: deploymentId, table: value[0], functionVersion: value[1] } : undefined
}

export const readActiveDeploymentId = async (kvs: CloudFrontKeyValueStoreClient, storeArn: string) => {
	const id = Number(parseValue(await getStoreValue(kvs, storeArn, ACTIVE_KEY))?.[1])

	return Number.isFinite(id) ? id : undefined
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

const stageRoutes = async (
	kvs: CloudFrontKeyValueStoreClient,
	state: z.output<typeof routeDeploymentInputSchema>,
	prior?: z.output<typeof routeDeploymentInputSchema>
) => {
	const routes = sortRoutes(state.routes)
	const table = getRouteTableId(routes)
	const priorTable = prior ? getRouteTableId(sortRoutes(prior.routes)) : undefined

	const deployment: RouteDeployment = {
		id: state.deploymentId,
		table,
		functionVersion: state.functionVersion,
	}

	const mutations: Mutation[] = [
		...(priorTable === table ? [] : getTableMutations(table, routes)),
		{
			type: 'put',
			key: `${DEPLOY_KEY_PREFIX}${deployment.id}`,
			value: `${table}:${deployment.functionVersion}`,
		},
	]

	// Route rows are written before the mapping, so an interrupted upload
	// can't be selected by a preview or promotion.
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
		'route-deployment': {
			async createResource(props) {
				return stageRoutes(kvs, routeDeploymentInputSchema.parse(props.state))
			},
			async updateResource(props) {
				const state = routeDeploymentInputSchema.parse(props.proposedState)
				const prior = routeDeploymentInputSchema.parse(props.priorState)

				return stageRoutes(kvs, state, prior.storeArn === state.storeArn ? prior : undefined)
			},
		},
	})
}

// ------------------------------------------------------------
// CLI

export const setActiveRouteDeployment = async (
	kvs: CloudFrontKeyValueStoreClient,
	storeArn: string,
	deployment?: RouteDeployment
) => {
	await updateKeys(kvs, {
		storeArn,
		mutations: deployment ? [getActivateMutation(deployment)] : [{ type: 'delete', key: ACTIVE_KEY }],
	})
}

