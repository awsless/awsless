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
	})

	it('only opens the cache to the lambdas, jobs & instances of the app', () => {
		const code = { file: { nocheck: './program.ts' } }
		const result = createTestApp({
			stacks: [
				{ name: 'stack-1', caches: { session: {} }, jobs: { export: { code } } },
				{ name: 'stack-2', instances: { worker: { code } } },
			],
		})

		const before = listResources(result.app, 'aws_vpc_security_group_ingress_rule').filter(meta =>
			meta.urn.includes('cache:{session}')
		)

		// The lambda rules exist right away, the job & instance rules once
		// every stack has synthed.
		expect(before).toHaveLength(2)

		result.ready()

		const rules = listResources(result.app, 'aws_vpc_security_group_ingress_rule').filter(meta =>
			meta.urn.includes('cache:{session}')
		)

		expect(rules).toHaveLength(6)

		for (const rule of rules) {
			expect(rule.input.referencedSecurityGroupId).toBeDefined()
			expect(rule.input.cidrIpv4).toBeUndefined()
			expect(rule.input.cidrIpv6).toBeUndefined()
		}
	})

	it('only sends usage limits that are set', () => {
		const { app } = createTestApp({
			stacks: [{ name: 'stack-1', caches: { session: { maxECPU: 5000 } } }],
		})

		const cache = listResources(app, 'aws_elasticache_serverless_cache')[0]!

		expect(cache.input.cacheUsageLimits).toEqual([
			{ dataStorage: [], ecpuPerSecond: [{ minimum: undefined, maximum: 5000 }] },
		])
	})
})
