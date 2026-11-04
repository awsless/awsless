import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchClickHouseKey, loadClickHouseKey } from '../src/cli/ui/complex/fetch-clickhouse-key'

const ENV = ['CLICKHOUSE_ORG_ID', 'CLICKHOUSE_CLOUD_API_KEY', 'CLICKHOUSE_CLOUD_API_SECRET'] as const

describe('clickhouse cloud api key', () => {
	let stored: Record<string, string>

	beforeEach(() => {
		stored = {}
		for (const name of ENV) delete process.env[name]
		process.env.SKIP_PROMPT = '1'

		// The tests run on node, where the keychain is bun's.
		vi.stubGlobal('Bun', {
			secrets: {
				get: async ({ service, name }: { service: string; name: string }) =>
					stored[`${service}/${name}`] ?? null,
				set: async () => {},
			},
		})
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		delete process.env.SKIP_PROMPT
		for (const name of ENV) delete process.env[name]
	})

	it('should read the key stored for the account', async () => {
		stored['awsless/clickhouse:111111111111'] = JSON.stringify({
			organizationId: 'org',
			tokenKey: 'key',
			tokenSecret: 'secret',
		})

		await expect(fetchClickHouseKey('111111111111')).resolves.toEqual({
			organizationId: 'org',
			tokenKey: 'key',
			tokenSecret: 'secret',
		})
		await expect(loadClickHouseKey('111111111111')).resolves.toEqual({
			organizationId: 'org',
			tokenKey: 'key',
			tokenSecret: 'secret',
		})
	})

	it('should let the env override the keychain', async () => {
		stored['awsless/clickhouse:222222222222'] = JSON.stringify({
			organizationId: 'org',
			tokenKey: 'key',
			tokenSecret: 'secret',
		})
		process.env.CLICKHOUSE_ORG_ID = 'env-org'
		process.env.CLICKHOUSE_CLOUD_API_KEY = 'env-key'
		process.env.CLICKHOUSE_CLOUD_API_SECRET = 'env-secret'

		await expect(fetchClickHouseKey('222222222222')).resolves.toEqual({
			organizationId: 'env-org',
			tokenKey: 'env-key',
			tokenSecret: 'env-secret',
		})
	})

	it('should look the organization up when the env leaves it out', async () => {
		const fetch = vi.fn(async () => Response.json({ result: [{ id: 'looked-up-org', name: 'Org' }] }))
		vi.stubGlobal('fetch', fetch)
		process.env.CLICKHOUSE_CLOUD_API_KEY = 'env-key'
		process.env.CLICKHOUSE_CLOUD_API_SECRET = 'env-secret'

		await expect(fetchClickHouseKey('444444444444')).resolves.toEqual({
			organizationId: 'looked-up-org',
			tokenKey: 'env-key',
			tokenSecret: 'env-secret',
		})
		expect(fetch).toHaveBeenCalledWith('https://api.clickhouse.cloud/v1/organizations', {
			headers: { authorization: `Basic ${Buffer.from('env-key:env-secret').toString('base64')}` },
		})
	})

	it('should refuse a key the api rejects', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('', { status: 401 }))
		)
		process.env.CLICKHOUSE_CLOUD_API_KEY = 'bad-key'
		process.env.CLICKHOUSE_CLOUD_API_SECRET = 'bad-secret'

		await expect(fetchClickHouseKey('555555555555')).rejects.toThrow('refused the API key')
	})

	it('should refuse without a key when it may not prompt', async () => {
		await expect(fetchClickHouseKey('333333333333')).rejects.toThrow('needs a ClickHouse Cloud API key')
		await expect(loadClickHouseKey('333333333333')).resolves.toBeUndefined()
	})
})
