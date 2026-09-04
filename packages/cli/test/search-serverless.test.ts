import { findInputDeps } from '@terraforge/core'
import { describe, expect, it } from 'vitest'
import { createTestApp, listResources } from './_kit'

const findActions = (shared: ReturnType<typeof createTestApp>['shared']) => {
	const bundle = shared.get('bundle', 'main')

	return Array.from(bundle.statements).flatMap(statement => statement.actions)
}

describe('search serverless', () => {
	it('should grant aoss access by default', () => {
		const { shared } = createTestApp({
			stacks: [{ name: 'stack-1', searchs: { users: {} } }],
		})

		const actions = findActions(shared)

		expect(actions).toContain('aoss:APIAccessAll')
		expect(actions).not.toContain('es:ESHttp*')
	})

	it('should reject provisioned domain settings', () => {
		expect(() =>
			createTestApp({
				defaults: { search: { type: 't3.small' } } as any,
				stacks: [{ name: 'stack-1', searchs: { users: {} } }],
			})
		).toThrow()
	})

	it('should accept capacity limits', () => {
		const { app } = createTestApp({
			defaults: { search: { capacity: { search: { min: 2, max: 4 } } } },
			stacks: [{ name: 'stack-1', searchs: { users: {} } }],
		})

		const group = listResources(app, 'aws_opensearchserverless_collection_group')[0]!

		expect(group.input.capacityLimits[0]).toMatchObject({
			minSearchCapacityInOcu: 2,
			maxSearchCapacityInOcu: 4,
		})
	})

	it('lists every role holding the app wide grant as a data access principal', () => {
		const code = { file: { nocheck: './handler.ts' } }
		const result = createTestApp({
			app: {
				onFailure: { consumer: { code } },
				onErrorLog: { code },
			},
			stacks: [
				{
					name: 'stack-1',
					searchs: { users: {} },
					jobs: { export: { code } },
					instances: { worker: { code } },
					functions: {
						echo: { code, memorySize: '256 MB' },
						boxed: { code, sandbox: true },
					},
				},
			],
		})

		result.ready()

		const policy = listResources(result.app, 'aws_opensearchserverless_access_policy').find(meta =>
			meta.input.name.endsWith('-functions')
		)!
		const principals = findInputDeps(policy.input.policy)
			.filter(dep => dep.type === 'aws_iam_role')
			.map(dep => dep.input.description)

		expect(principals).toEqual(
			expect.arrayContaining([
				'test-app--function--bundle',
				'test-app--stack-1--function--echo',
				'test-app--stack-1--job--export',
				'test-app--stack-1--instance--worker',
				'test-app--on-failure--handler',
				'test-app--on-error-log--handler',
			])
		)

		// A sandboxed function holds no app wide grant, so it's no principal.
		expect(principals).not.toContain('test-app--stack-1--function--boxed')
	})

	it('should reject invalid capacity steps', () => {
		expect(() =>
			createTestApp({
				defaults: { search: { capacity: { search: { min: 1 } } } },
				stacks: [{ name: 'stack-1', searchs: { users: {} } }],
			})
		).toThrow()
	})
})
