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
	UpdateAliasCommand,
} from '@aws-sdk/client-lambda'
import { DynamoDBClient } from '@awsless/dynamodb'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	claimDeployment,
	Deployment,
	preflightDeployment,
	previousDeploymentId,
	promoteDeployment,
	slugifyBranch,
} from '../src/util/deployment'
import { notFound } from './_kit'

const appId = 'app-id'
const functionName = 'app--function--bundle'

type Attr = { S?: string; N?: string; BOOL?: boolean }

const fromAttr = (value: Attr) => ('S' in value ? value.S : 'N' in value ? Number(value.N) : value.BOOL)
const toAttr = (value: unknown): Attr =>
	typeof value === 'string' ? { S: value } : typeof value === 'number' ? { N: String(value) } : { BOOL: !!value }
const toItem = (row: Record<string, unknown>) =>
	Object.fromEntries(
		Object.entries(row)
			.filter(([, value]) => value !== undefined)
			.map(([key, value]) => [key, toAttr(value)])
	)
const fromItem = (item: Record<string, Attr>) =>
	Object.fromEntries(Object.entries(item).map(([key, value]) => [key, fromAttr(value)]))

const seedRow = (row: Partial<Deployment> & { branch: string; seq: number }): Deployment => ({
	appId,
	id: `${row.branch}-${row.seq}`,
	createdAt: '2026-07-16T00:00:00.000Z',
	...row,
})

const mockAws = (rows: Deployment[] = []) => {
	const manifest = new Map<string, Record<string, unknown>>(rows.map(row => [row.id, { ...row }]))
	const stores = new Map<string, Map<string, string>>()
	let live: { FunctionVersion: string; Description: string } | undefined = {
		FunctionVersion: '1',
		Description: 'main-1',
	}
	const deploymentAliases = new Map<string, { FunctionVersion: string }>([
		['deployment-main-1', { FunctionVersion: '1' }],
		['deployment-main-2', { FunctionVersion: '2' }],
		['deployment-main-3', { FunctionVersion: '3' }],
	])
	let failStore: string | undefined
	let failAlias = false
	let failMarkPromoted = false
	let missingVersion = false
	let raceFirstClaim = false
	let aliasUpdates = 0

	const getStore = (arn: string) => {
		if (!stores.has(arn)) {
			stores.set(arn, new Map())
		}

		return stores.get(arn)!
	}

	vi.spyOn(DynamoDBClient.prototype, 'send').mockImplementation(async (command: any) => {
		const name = command.constructor.name
		const input = command.input

		if (name === 'GetItemCommand') {
			const item = manifest.get(fromAttr(input.Key.id) as string)

			return item ? { Item: toItem(item) } : {}
		}

		if (name === 'QueryCommand') {
			const values = Object.values(input.ExpressionAttributeValues ?? {}).map(value => fromAttr(value as Attr))
			const prefix = values.find(value => typeof value === 'string' && value.endsWith('-')) as string | undefined
			let items = [...manifest.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)))

			if (prefix) {
				items = items.filter(item => String(item.id).startsWith(prefix))
			}

			if (input.ScanIndexForward === false) {
				items.reverse()
			}

			return { Items: items.slice(0, input.Limit ?? 100).map(toItem) }
		}

		if (name === 'PutItemCommand') {
			const item = fromItem(input.Item)
			const id = item.id as string

			if (raceFirstClaim) {
				raceFirstClaim = false
				manifest.set(id, item)
				throw notFound('ConditionalCheckFailedException')
			}

			if (input.ConditionExpression?.includes('attribute_not_exists') && manifest.has(id)) {
				throw notFound('ConditionalCheckFailedException')
			}

			manifest.set(id, item)

			return {}
		}

		if (name === 'UpdateItemCommand') {
			if (failMarkPromoted) {
				failMarkPromoted = false
				throw new Error('Manifest update failed')
			}

			const id = fromAttr(input.Key.id) as string
			const item = manifest.get(id)

			if (input.ConditionExpression?.includes('attribute_exists') && !item) {
				throw notFound('ConditionalCheckFailedException')
			}

			const names = input.ExpressionAttributeNames ?? {}
			const values = input.ExpressionAttributeValues ?? {}

			for (const [, nameAlias, valueAlias] of String(input.UpdateExpression).matchAll(/(#\w+) = (:\w+)/g)) {
				item![names[nameAlias!] as string] = fromAttr(values[valueAlias!] as Attr)
			}

			return {}
		}

		if (name === 'DeleteItemCommand') {
			manifest.delete(fromAttr(input.Key.id) as string)

			return {}
		}

		throw new Error(`Unexpected DynamoDB command: ${name}`)
	})

	vi.spyOn(CloudFrontKeyValueStoreClient.prototype, 'send').mockImplementation(async (command: any) => {
		if (command instanceof GetKeyCommand) {
			const value = getStore(command.input.KvsARN!).get(command.input.Key!)

			if (value === undefined) {
				throw notFound()
			}

			return { Value: value }
		}

		if (command instanceof DescribeKeyValueStoreCommand) {
			return { ETag: 'etag' }
		}

		if (command instanceof UpdateKeysCommand) {
			if (failStore === command.input.KvsARN! && command.input.Puts?.[0]?.Value?.endsWith(':main-2')) {
				throw new Error('KVS update failed')
			}

			const store = getStore(command.input.KvsARN!)

			for (const item of command.input.Puts ?? []) {
				store.set(item.Key!, item.Value!)
			}

			for (const item of command.input.Deletes ?? []) {
				store.delete(item.Key!)
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

			const alias = deploymentAliases.get(command.input.Name!)

			if (!alias) {
				throw notFound()
			}

			return alias
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
					FunctionVersion: command.input.FunctionVersion!,
					Description: command.input.Description!,
				}

				if (failAlias) {
					failAlias = false
					throw new Error('Alias update failed')
				}
			}

			return {}
		}

		if (command instanceof CreateAliasCommand) {
			if (command.input.Name === 'live') {
				aliasUpdates += 1
				live = {
					FunctionVersion: command.input.FunctionVersion!,
					Description: command.input.Description!,
				}
			}

			return {}
		}

		throw new Error(`Unexpected Lambda command: ${command.constructor.name}`)
	})

	return {
		manifest,
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
		setFailMarkPromoted() {
			failMarkPromoted = true
		},
		setMissingVersion() {
			missingVersion = true
		},
		setRaceFirstClaim() {
			raceFirstClaim = true
		},
		removeAlias() {
			live = undefined
		},
		setLiveDescription(description: string) {
			live!.Description = description
		},
	}
}

const seedManifest = () => [
	seedRow({
		branch: 'main',
		seq: 1,
		createdAt: '2026-07-16T00:01:00.000Z',
		functionVersion: '1',
		promotedAt: '2026-07-16T00:01:30.000Z',
	}),
	seedRow({ branch: 'main', seq: 2, createdAt: '2026-07-16T00:02:00.000Z', functionVersion: '2' }),
	seedRow({ branch: 'main', seq: 3, createdAt: '2026-07-16T00:03:00.000Z', functionVersion: '3' }),
]

const clients = () => ({
	kvs: new CloudFrontKeyValueStoreClient({ region: 'us-east-1' }),
	lambda: new LambdaClient({ region: 'us-east-1' }),
	dynamo: new DynamoDBClient({ region: 'us-east-1' }),
	appId,
	functionName,
})

const seedStore = (stores: Map<string, Map<string, string>>) => {
	const arn = `arn:aws:cloudfront::123456789012:key-value-store/store`
	stores.set(
		arn,
		new Map([
			['$active', 'aaaaaaaa:main-1'],
			['$deploy:main-1', 'aaaaaaaa:1'],
			['$deploy:main-2', 'bbbbbbbb:2'],
		])
	)

	return {
		arn,
		deployment: { id: 'main-2', table: 'bbbbbbbb', functionVersion: '2' },
	}
}

describe('deployment keys', () => {
	it('should keep the branch name, replacing chars a lambda alias rejects', () => {
		expect(slugifyBranch('awsless-next-2')).toBe('awsless-next-2')
		expect(slugifyBranch('feature/foo-bar')).toBe('feature-foo-bar')
		expect(slugifyBranch('Feat_X')).toBe('Feat_X')
		expect(slugifyBranch(undefined)).toBe('local')
		expect(slugifyBranch('***')).toBe('local')
	})

})

describe('deployment claims', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should claim sequential numbers per branch', async () => {
		const aws = mockAws()
		const { dynamo } = clients()

		const first = await claimDeployment({ client: dynamo, appId })
		const second = await claimDeployment({ client: dynamo, appId })

		expect(first.seq).toBe(1)
		expect(second.seq).toBe(2)
		expect(second.branch).toBe(first.branch)
		expect(aws.manifest.size).toBe(2)
	})

	it('should retry a lost claim race with the next number', async () => {
		const aws = mockAws()
		const { dynamo } = clients()
		aws.setRaceFirstClaim()

		const deployment = await claimDeployment({ client: dynamo, appId })

		expect(deployment.seq).toBe(2)
		expect(aws.manifest.size).toBe(2)
	})

	it('should ignore sibling branches that share the id prefix', async () => {
		const aws = mockAws()
		const { dynamo } = clients()

		const first = await claimDeployment({ client: dynamo, appId })
		const sibling = seedRow({ branch: `${first.branch}-extra`, seq: 99 })
		aws.manifest.set(sibling.id, { ...sibling })

		const second = await claimDeployment({ client: dynamo, appId })

		expect(second.seq).toBe(2)
	})
})

describe('deployment promotion', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should switch the routes before updating the live alias once', async () => {
		const aws = mockAws(seedManifest())
		const store = seedStore(aws.stores)

		await promoteDeployment({
			...clients(),
			id: 'main-2',
			store,
			rejectStale: true,
		})

		expect(aws.stores.get(store.arn)?.get('$active')).toBe('bbbbbbbb:main-2')
		expect(aws.alias).toEqual({
			FunctionVersion: '2',
			Description: 'main-2',
		})
		expect(aws.aliasUpdates).toBe(1)
		expect(aws.manifest.get('main-2')?.promotedAt).toBeDefined()
	})

	it('should leave everything untouched when the route switch fails', async () => {
		const aws = mockAws(seedManifest())
		const store = seedStore(aws.stores)
		aws.setFailStore(store.arn)

		await expect(
			promoteDeployment({
				...clients(),
				id: 'main-2',
				store,
			})
		).rejects.toThrow('KVS update failed')

		expect(aws.stores.get(store.arn)?.get('$active')).toBe('aaaaaaaa:main-1')
		expect(aws.alias?.FunctionVersion).toBe('1')
		expect(aws.aliasUpdates).toBe(0)
	})

	it('should preflight the function version before changing the routes', async () => {
		const aws = mockAws(seedManifest())
		const store = seedStore(aws.stores)
		aws.setMissingVersion()

		await expect(
			promoteDeployment({
				...clients(),
				id: 'main-2',
				store,
			})
		).rejects.toThrow('function version "2"')

		expect(aws.stores.get(store.arn)?.get('$active')).toBe('aaaaaaaa:main-1')
		expect(aws.aliasUpdates).toBe(0)
	})

	it('should restore the routes and the prior alias after an alias failure', async () => {
		const aws = mockAws(seedManifest())
		const store = seedStore(aws.stores)
		aws.setFailAlias()

		await expect(
			promoteDeployment({
				...clients(),
				id: 'main-2',
				store,
			})
		).rejects.toThrow('Alias update failed')

		expect(aws.stores.get(store.arn)?.get('$active')).toBe('aaaaaaaa:main-1')
		expect(aws.alias).toEqual({
			FunctionVersion: '1',
			Description: 'main-1',
		})
		expect(aws.aliasUpdates).toBe(2)
	})

	it('should restore traffic and leave the target unpromoted when the manifest write fails', async () => {
		const aws = mockAws(seedManifest())
		const store = seedStore(aws.stores)
		aws.setFailMarkPromoted()

		await expect(
			promoteDeployment({
				...clients(),
				id: 'main-2',
				store,
			})
		).rejects.toThrow('Manifest update failed')

		expect(aws.stores.get(store.arn)?.get('$active')).toBe('aaaaaaaa:main-1')
		expect(aws.alias?.FunctionVersion).toBe('1')
		expect(aws.manifest.get('main-2')?.promotedAt).toBeUndefined()
	})

	it('should reject a stale async-only promotion', async () => {
		const aws = mockAws(seedManifest())

		await promoteDeployment({
			...clients(),
			id: 'main-3',
		})

		await expect(
			promoteDeployment({
				...clients(),
				id: 'main-2',
				rejectStale: true,
			})
		).rejects.toThrow('A newer deployment is already live')

		expect(aws.alias?.FunctionVersion).toBe('3')
		expect(aws.aliasUpdates).toBe(1)
	})

	it('should preflight the candidate against the live promotion time', async () => {
		const aws = mockAws(seedManifest())
		const candidate = aws.manifest.get('main-2') as Deployment

		await promoteDeployment({
			...clients(),
			id: 'main-3',
		})

		await expect(preflightDeployment({ ...clients(), deployment: candidate })).rejects.toThrow(
			'A newer deployment is already live'
		)

		aws.setLiveDescription('legacy description')
		await expect(preflightDeployment({ ...clients(), deployment: candidate })).resolves.toBeUndefined()
	})

	it('should skip staged deployments that were never promoted', async () => {
		const aws = mockAws(seedManifest())

		await promoteDeployment({
			...clients(),
			id: 'main-3',
		})

		await expect(previousDeploymentId(clients())).resolves.toBe('main-1')
		expect(aws.manifest.get('main-2')?.promotedAt).toBeUndefined()
	})

	it('should recreate a missing live alias after deployment', async () => {
		const aws = mockAws(seedManifest())
		aws.removeAlias()

		await promoteDeployment({
			...clients(),
			id: 'main-2',
		})

		expect(aws.alias).toEqual({
			FunctionVersion: '2',
			Description: 'main-2',
		})
		expect(aws.aliasUpdates).toBe(2)
	})

	it('should rollback an async-only app to the previously promoted deployment', async () => {
		const aws = mockAws(seedManifest())

		await promoteDeployment({
			...clients(),
			id: 'main-2',
		})

		await promoteDeployment({
			...clients(),
			id: 'main-3',
		})

		const previous = await previousDeploymentId(clients())

		expect(previous).toBe('main-2')

		await promoteDeployment({
			...clients(),
			id: previous,
		})

		expect(aws.alias).toEqual({
			FunctionVersion: '2',
			Description: 'main-2',
		})
	})
})
