import { CloudFrontClient, DescribeKeyValueStoreCommand } from '@aws-sdk/client-cloudfront'
import {
	CloudFrontKeyValueStoreClient,
	DescribeKeyValueStoreCommand as DescribeDataStoreCommand,
	GetKeyCommand,
	UpdateKeysCommand,
} from '@aws-sdk/client-cloudfront-keyvaluestore'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCloudFrontKvsProvider, setActiveRouteDeployment } from '../src/formation/cloudfront-kvs'
import { credentials, notFound, sent } from './_kit'

const storeArn = 'arn:aws:cloudfront::123456789012:key-value-store/test-router'

const state = {
	deploymentId: 'main-1',
	storeArn,
	routes: [{ key: '/api/*', value: JSON.stringify({ type: 's3', domainName: 'api.example.com' }) }],
	functionVersion: '17',
}

const mockAws = () => {
	const stores = new Map<string, Map<string, string>>()

	const getStore = (arn: string) => {
		if (!stores.has(arn)) {
			stores.set(arn, new Map())
		}

		return stores.get(arn)!
	}
	const storeSize = (arn: string) => {
		return [...getStore(arn)].reduce((total, [key, value]) => total + key.length + value.length, 0)
	}

	const cloudfront = vi.spyOn(CloudFrontClient.prototype, 'send').mockImplementation(async (command: any) => {
		if (command instanceof DescribeKeyValueStoreCommand) {
			const arn = `arn:aws:cloudfront::123456789012:key-value-store/${command.input.Name}`

			if (!stores.has(arn)) {
				throw notFound('EntityNotFound')
			}

			return { KeyValueStore: { Name: command.input.Name, ARN: arn } }
		}

		throw new Error(`Unexpected CloudFront command: ${command.constructor.name}`)
	})

	const kvs = vi.spyOn(CloudFrontKeyValueStoreClient.prototype, 'send').mockImplementation(async (command: any) => {
		if (command instanceof DescribeDataStoreCommand) {
			return {
				ETag: 'data-etag',
				TotalSizeInBytes: storeSize(command.input.KvsARN!),
			}
		}

		if (command instanceof UpdateKeysCommand) {
			const store = getStore(command.input.KvsARN!)

			for (const item of command.input.Deletes ?? []) {
				store.delete(item.Key!)
			}

			for (const item of command.input.Puts ?? []) {
				store.set(item.Key!, item.Value!)
			}

			return { ETag: 'data-etag' }
		}

		if (command instanceof GetKeyCommand) {
			const value = getStore(command.input.KvsARN!).get(command.input.Key!)

			if (value === undefined) {
				throw notFound('ResourceNotFoundException')
			}

			return { Key: command.input.Key, Value: value }
		}

		throw new Error(`Unexpected KVS command: ${command.constructor.name}`)
	})

	return {
		stores,
		getStore,
		cloudfront,
		kvs,
	}
}

const deployEntry = (store: Map<string, string>, id: string) => {
	const [table, functionVersion] = store.get(`$deploy:${id}`)!.split(':')

	return { table: table!, functionVersion: functionVersion! }
}

const cliClients = () => ({
	kvs: new CloudFrontKeyValueStoreClient({ region: 'us-east-1' }),
	storeArn,
})

describe('CloudFront route deployments', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should stage the route table before the mapping without activating it', async () => {
		const { getStore, kvs } = mockAws()
		const provider = createCloudFrontKvsProvider({ credentials, region: 'us-east-1' })
		const result = await provider.createResource({ type: 'route-deployment', state })
		const store = getStore(storeArn)
		const entry = deployEntry(store, 'main-1')

		expect(entry.table).toMatch(/^[0-9a-f]{8}$/)
		expect(entry.functionVersion).toBe('17')
		expect(store.get(`${entry.table}:/api/*`)).toBe(state.routes[0]!.value)
		expect(store.has('$active')).toBe(false)
		expect(result.state.routes).toHaveLength(1)

		// the table comes before the mapping
		const puts = sent(kvs, UpdateKeysCommand).flatMap(command => command.input.Puts ?? [])
		expect(puts.findIndex(item => item.Key!.endsWith(':/api/*'))).toBeLessThan(
			puts.findIndex(item => item.Key === '$deploy:main-1')
		)
	})

	it('should only add a mapping for a deployment with unchanged routes', async () => {
		const { getStore, kvs } = mockAws()
		const provider = createCloudFrontKvsProvider({ credentials, region: 'us-east-1' })
		const created = await provider.createResource({ type: 'route-deployment', state })
		kvs.mockClear()

		await provider.updateResource({
			type: 'route-deployment',
			priorState: created.state,
			proposedState: { ...state, deploymentId: 'main-2' },
		})

		const store = getStore(storeArn)
		const puts = sent(kvs, UpdateKeysCommand).flatMap(command => command.input.Puts ?? [])

		expect(deployEntry(store, 'main-2').table).toBe(deployEntry(store, 'main-1').table)
		expect(puts.map(item => item.Key)).toEqual(['$deploy:main-2'])
		expect(store.has('$active')).toBe(false)
	})

	it('should stage the full route table into a replaced store', async () => {
		const { getStore, kvs } = mockAws()
		const provider = createCloudFrontKvsProvider({ credentials, region: 'us-east-1' })
		const created = await provider.createResource({ type: 'route-deployment', state })
		const replacedArn = `${storeArn}-replaced`
		kvs.mockClear()

		await provider.updateResource({
			type: 'route-deployment',
			priorState: created.state,
			proposedState: { ...state, deploymentId: 'main-2', storeArn: replacedArn },
		})

		const store = getStore(replacedArn)
		const entry = deployEntry(store, 'main-2')

		expect(store.get(`${entry.table}:/api/*`)).toBe(state.routes[0]!.value)
	})

	it('should finish a partially written route table before staging its mapping', async () => {
		const { getStore, kvs } = mockAws()
		const provider = createCloudFrontKvsProvider({ credentials, region: 'us-east-1' })
		const routes = Array.from({ length: 60 }, (_, index) => ({
			key: `/page-${index}`,
			value: JSON.stringify({ type: 's3', domainName: `page-${index}.example.com` }),
		}))
		const deployment = { ...state, routes }
		const send = kvs.getMockImplementation()!
		let updates = 0

		kvs.mockImplementation(async command => {
			if (command instanceof UpdateKeysCommand && ++updates === 2) {
				throw new Error('Interrupted route upload')
			}

			return send(command)
		})

		await expect(provider.createResource({ type: 'route-deployment', state: deployment })).rejects.toThrow(
			'Interrupted route upload'
		)

		const store = getStore(storeArn)
		expect(store.has('$active')).toBe(false)

		kvs.mockImplementation(send)
		await provider.createResource({ type: 'route-deployment', state: deployment })

		const entry = deployEntry(store, 'main-1')
		expect(routes.every(route => store.get(`${entry.table}:${route.key}`) === route.value)).toBe(true)
		expect(store.has('$active')).toBe(false)
	})

	it('should store a separate route table for changed routes', async () => {
		const { getStore } = mockAws()
		const provider = createCloudFrontKvsProvider({ credentials, region: 'us-east-1' })
		const created = await provider.createResource({ type: 'route-deployment', state })

		await provider.updateResource({
			type: 'route-deployment',
			priorState: created.state,
			proposedState: {
				...state,
				deploymentId: 'main-2',
				routes: [{ key: '/api/*', value: JSON.stringify({ type: 's3', domainName: 'api-v2.example.com' }) }],
			},
		})

		const store = getStore(storeArn)
		const table1 = deployEntry(store, 'main-1').table
		const table2 = deployEntry(store, 'main-2').table

		expect(table1).not.toBe(table2)
		expect(store.get(`${table1}:/api/*`)).toContain('api.example.com')
		expect(store.get(`${table2}:/api/*`)).toContain('api-v2.example.com')
	})

	it('should activate an earlier route deployment', async () => {
		const { getStore } = mockAws()
		const provider = createCloudFrontKvsProvider({ credentials, region: 'us-east-1' })

		const first = await provider.createResource({ type: 'route-deployment', state })
		await provider.updateResource({
			type: 'route-deployment',
			priorState: first.state,
			proposedState: {
				...state,
				deploymentId: 'main-2',
				functionVersion: '18',
				routes: [{ key: '/api/*', value: JSON.stringify({ type: 's3', domainName: 'api-v2.example.com' }) }],
			},
		})

		const store = getStore(storeArn)
		await setActiveRouteDeployment(cliClients().kvs, storeArn, { id: 'main-2', ...deployEntry(store, 'main-2') })
		expect(store.get('$active')!.split(':')[1]).toBe('main-2')

		await setActiveRouteDeployment(cliClients().kvs, storeArn, { id: 'main-1', ...deployEntry(store, 'main-1') })

		expect(store.get('$active')).toBe(`${deployEntry(store, 'main-1').table}:main-1`)
	})

	it('should restore an absent active pointer', async () => {
		const { getStore } = mockAws()
		const clients = cliClients()

		await setActiveRouteDeployment(clients.kvs, storeArn, {
			id: 'main-1',
			table: 'aaaaaaaa',
			functionVersion: '17',
		})
		expect(getStore(storeArn).get('$active')).toBe('aaaaaaaa:main-1')

		await setActiveRouteDeployment(clients.kvs, storeArn)
		expect(getStore(storeArn).has('$active')).toBe(false)
	})

})
