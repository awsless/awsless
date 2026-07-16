import {
	CloudFrontKeyValueStoreClient,
	DescribeKeyValueStoreCommand,
	GetKeyCommand,
	UpdateKeysCommand,
} from '@aws-sdk/client-cloudfront-keyvaluestore'
import {
	CreateAliasCommand,
	GetAliasCommand,
	GetFunctionCommand,
	LambdaClient,
	ListAliasesCommand,
	UpdateAliasCommand,
} from '@aws-sdk/client-lambda'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { preflightDeployment, promoteDeployment, readFunctionDeployment } from '../src/util/deployment'
import { notFound } from './_kit'

const mockAws = () => {
	const stores = new Map<string, Map<string, string>>()
	let live: { FunctionVersion: string; Description: string } | undefined = {
		FunctionVersion: '1',
		Description: '$awsless:deployment:1:1',
	}
	const deploymentAliases = new Map<string, { FunctionVersion: string; Description?: string }>([
		['deployment-1', { FunctionVersion: '1', Description: '$awsless:promoted' }],
		['deployment-2', { FunctionVersion: '2' }],
		['deployment-3', { FunctionVersion: '3' }],
	])
	let failStore: string | undefined
	let failAlias = false
	let failDeploymentAlias = false
	let missingVersion = false
	let aliasUpdates = 0

	const getStore = (arn: string) => {
		if (!stores.has(arn)) {
			stores.set(arn, new Map())
		}

		return stores.get(arn)!
	}

	vi.spyOn(CloudFrontKeyValueStoreClient.prototype, 'send').mockImplementation(async (command: any) => {
		if (command instanceof GetKeyCommand) {
			const value = getStore(command.input.KvsARN).get(command.input.Key)

			if (value === undefined) {
				throw notFound()
			}

			return { Value: value }
		}

		if (command instanceof DescribeKeyValueStoreCommand) {
			return { ETag: 'etag' }
		}

		if (command instanceof UpdateKeysCommand) {
			if (failStore === command.input.KvsARN && command.input.Puts?.[0]?.Value?.endsWith(':2')) {
				throw new Error('KVS update failed')
			}

			const store = getStore(command.input.KvsARN)

			for (const item of command.input.Puts ?? []) {
				store.set(item.Key, item.Value)
			}

			for (const item of command.input.Deletes ?? []) {
				store.delete(item.Key)
			}

			return { ETag: 'etag' }
		}

		throw new Error(`Unexpected KVS command: ${command.constructor.name}`)
	})

	vi.spyOn(LambdaClient.prototype, 'send').mockImplementation(async (command: any) => {
		if (command instanceof GetAliasCommand) {
			if (command.input.Name === 'live') {
				if (!live) {
					throw notFound()
				}

				return live
			}

			const alias = deploymentAliases.get(command.input.Name)

			if (!alias) {
				throw notFound()
			}

			return alias
		}

		if (command instanceof ListAliasesCommand) {
			return {
				Aliases: [...deploymentAliases].map(([Name, alias]) => ({ Name, ...alias })),
			}
		}

		if (command instanceof GetFunctionCommand) {
			if (missingVersion) {
				throw notFound()
			}

			return {}
		}

		if (command instanceof UpdateAliasCommand) {
			if (command.input.Name === 'live') {
				aliasUpdates += 1

				if (!live) {
					throw notFound()
				}

				live = {
					FunctionVersion: command.input.FunctionVersion,
					Description: command.input.Description,
				}

				if (failAlias) {
					failAlias = false
					throw new Error('Alias update failed')
				}
			} else {
				if (!deploymentAliases.has(command.input.Name)) {
					throw notFound()
				}

				deploymentAliases.set(command.input.Name, {
					FunctionVersion: command.input.FunctionVersion,
					Description: command.input.Description,
				})

				if (failDeploymentAlias) {
					failDeploymentAlias = false
					throw new Error('Deployment marker failed')
				}
			}

			return {}
		}

		if (command instanceof CreateAliasCommand) {
			if (command.input.Name === 'live') {
				aliasUpdates += 1
				live = {
					FunctionVersion: command.input.FunctionVersion,
					Description: command.input.Description,
				}
			} else {
				deploymentAliases.set(command.input.Name, {
					FunctionVersion: command.input.FunctionVersion,
					Description: command.input.Description,
				})
			}

			return {}
		}

		throw new Error(`Unexpected Lambda command: ${command.constructor.name}`)
	})

	return {
		stores,
		get alias() {
			return live
		},
		get aliasUpdates() {
			return aliasUpdates
		},
		setFailStore(arn: string) {
			failStore = arn
		},
		setFailAlias() {
			failAlias = true
		},
		setFailDeploymentAlias() {
			failDeploymentAlias = true
		},
		setMissingVersion() {
			missingVersion = true
		},
		removeAlias() {
			live = undefined
		},
		setLiveDescription(description: string) {
			live!.Description = description
		},
		getDeploymentAlias(id: number) {
			return deploymentAliases.get(`deployment-${id}`)
		},
		removeDeploymentAlias(id: number) {
			deploymentAliases.delete(`deployment-${id}`)
		},
	}
}

const functionName = 'app--function--bundle'
const clients = () => ({
	kvs: new CloudFrontKeyValueStoreClient({ region: 'us-east-1' }),
	lambda: new LambdaClient({ region: 'us-east-1' }),
})
const seedStore = (stores: Map<string, Map<string, string>>) => {
	const arn = `arn:aws:cloudfront::123456789012:key-value-store/store`
	stores.set(
		arn,
		new Map([
			['$active', 'aaaaaaaa:1'],
			['$deploy:1', 'aaaaaaaa:1'],
			['$deploy:2', 'bbbbbbbb:2'],
		])
	)

	return {
		arn,
		deployment: { id: 2, table: 'bbbbbbbb', functionVersion: '2' },
	}
}

describe('deployment promotion', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should switch the routes before updating the live alias once', async () => {
		const aws = mockAws()
		const store = seedStore(aws.stores)

		await promoteDeployment({
			...clients(),
			functionName,
			deploymentId: 2,
			functionVersion: '2',
			store,
			rejectStale: true,
		})

		expect(aws.stores.get(store.arn)?.get('$active')).toBe('bbbbbbbb:2')
		expect(aws.alias).toEqual({
			FunctionVersion: '2',
			Description: '$awsless:deployment:2:2',
		})
		expect(aws.aliasUpdates).toBe(1)
	})

	it('should leave everything untouched when the route switch fails', async () => {
		const aws = mockAws()
		const store = seedStore(aws.stores)
		aws.setFailStore(store.arn)

		await expect(
			promoteDeployment({
				...clients(),
				functionName,
				deploymentId: 2,
				functionVersion: '2',
				store,
			})
		).rejects.toThrow('KVS update failed')

		expect(aws.stores.get(store.arn)?.get('$active')).toBe('aaaaaaaa:1')
		expect(aws.alias?.FunctionVersion).toBe('1')
		expect(aws.aliasUpdates).toBe(0)
	})

	it('should preflight the function version before changing the routes', async () => {
		const aws = mockAws()
		const store = seedStore(aws.stores)
		aws.setMissingVersion()

		await expect(
			promoteDeployment({
				...clients(),
				functionName,
				deploymentId: 2,
				functionVersion: '2',
				store,
			})
		).rejects.toThrow('function version "2"')

		expect(aws.stores.get(store.arn)?.get('$active')).toBe('aaaaaaaa:1')
		expect(aws.aliasUpdates).toBe(0)
	})

	it('should restore the routes and the prior alias after an alias failure', async () => {
		const aws = mockAws()
		const store = seedStore(aws.stores)
		aws.setFailAlias()

		await expect(
			promoteDeployment({
				...clients(),
				functionName,
				deploymentId: 2,
				functionVersion: '2',
				store,
			})
		).rejects.toThrow('Alias update failed')

		expect(aws.stores.get(store.arn)?.get('$active')).toBe('aaaaaaaa:1')
		expect(aws.alias).toEqual({
			FunctionVersion: '1',
			Description: '$awsless:deployment:1:1',
		})
		expect(aws.aliasUpdates).toBe(2)
	})

	it('should restore traffic and leave the target unpromoted when its marker fails', async () => {
		const aws = mockAws()
		const store = seedStore(aws.stores)
		aws.setFailDeploymentAlias()

		await expect(
			promoteDeployment({
				...clients(),
				functionName,
				deploymentId: 2,
				functionVersion: '2',
				store,
			})
		).rejects.toThrow('Deployment marker failed')

		expect(aws.stores.get(store.arn)?.get('$active')).toBe('aaaaaaaa:1')
		expect(aws.alias?.FunctionVersion).toBe('1')
		expect(aws.getDeploymentAlias(2)?.Description).not.toBe('$awsless:promoted')
	})

	it('should seed the current route deployment as promoted during migration', async () => {
		const aws = mockAws()
		const store = seedStore(aws.stores)
		aws.removeDeploymentAlias(1)

		await promoteDeployment({
			...clients(),
			functionName,
			deploymentId: 2,
			functionVersion: '2',
			store,
		})

		expect(aws.getDeploymentAlias(1)?.Description).toBe('$awsless:promoted')
	})

	it('should reject a stale async-only promotion', async () => {
		const aws = mockAws()

		await promoteDeployment({
			...clients(),
			functionName,
			deploymentId: 3,
			functionVersion: '3',
		})

		await expect(
			promoteDeployment({
				...clients(),
				functionName,
				deploymentId: 2,
				functionVersion: '2',
				rejectStale: true,
			})
		).rejects.toThrow('A newer deployment is already live')

		expect(aws.alias?.FunctionVersion).toBe('3')
		expect(aws.aliasUpdates).toBe(1)
	})

	it('should preflight the deployment high-water before apply', async () => {
		const aws = mockAws()

		await promoteDeployment({
			...clients(),
			functionName,
			deploymentId: 3,
			functionVersion: '3',
		})

		await expect(preflightDeployment({ ...clients(), functionName, deploymentId: 2 })).rejects.toThrow(
			'A newer deployment is already live'
		)

		aws.setLiveDescription('legacy description')
		await expect(preflightDeployment({ ...clients(), functionName, deploymentId: 2 })).resolves.toBeUndefined()
	})

	it('should skip staged deployments that were never promoted', async () => {
		const aws = mockAws()

		await promoteDeployment({
			...clients(),
			functionName,
			deploymentId: 3,
			functionVersion: '3',
		})

		await expect(readFunctionDeployment({ lambda: clients().lambda, functionName })).resolves.toEqual({
			id: 1,
			functionVersion: '1',
		})
		expect(aws.getDeploymentAlias(2)?.Description).not.toBe('$awsless:promoted')
	})

	it('should recreate a missing live alias after deployment', async () => {
		const aws = mockAws()
		aws.removeAlias()

		await promoteDeployment({
			...clients(),
			functionName,
			deploymentId: 2,
			functionVersion: '2',
			routers: [],
		})

		expect(aws.alias).toEqual({
			FunctionVersion: '2',
			Description: '$awsless:deployment:2:2',
		})
		expect(aws.aliasUpdates).toBe(2)
	})

	it('should rollback an async-only app from its immutable aliases', async () => {
		const aws = mockAws()
		const { lambda } = clients()

		await promoteDeployment({
			...clients(),
			functionName,
			deploymentId: 2,
			functionVersion: '2',
			routers: [],
		})

		await promoteDeployment({
			...clients(),
			functionName,
			deploymentId: 3,
			functionVersion: '3',
		})

		const previous = await readFunctionDeployment({ lambda, functionName })

		expect(previous).toEqual({
			id: 2,
			functionVersion: '2',
		})

		await promoteDeployment({
			...clients(),
			functionName,
			deploymentId: previous.id,
			functionVersion: previous.functionVersion,
			routers: [],
		})

		expect(aws.alias).toEqual({
			FunctionVersion: '2',
			Description: '$awsless:deployment:2:3',
		})
	})
})
