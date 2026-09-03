import { describe, expect, it } from 'vitest'
import { createTestApp, listResources } from './_kit'

describe('cache', () => {
	it('creates a serverless valkey cache inside the vpc', () => {
		const { app } = createTestApp({
			stacks: [{ name: 'stack-1', caches: { session: {} } }],
		})

		const cache = listResources(app, 'aws_elasticache_serverless_cache')[0]!

		expect(cache.input.name).toBe('test-app-stack-1-cache-session')
		expect(cache.input.engine).toBe('valkey')
		expect(cache.input.cacheUsageLimits).toBeUndefined()
		expect(listResources(app, 'aws_security_group').some(meta => meta.input.name === cache.input.name)).toBe(true)
		expect(listResources(app, 'aws_vpc_security_group_ingress_rule')).toHaveLength(4)
	})

	it('only sends usage limits that are set', () => {
		const { app } = createTestApp({
			stacks: [{ name: 'stack-1', caches: { session: { maxECPU: 5000 } } }],
		})

		const cache = listResources(app, 'aws_elasticache_serverless_cache')[0]!

		expect(cache.input.cacheUsageLimits).toEqual([{ dataStorage: [], ecpuPerSecond: [{ minimum: undefined, maximum: 5000 }] }])
	})
})
