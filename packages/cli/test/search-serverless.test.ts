import { describe, expect, it } from 'vitest'
import { createTestApp } from './_kit'

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
		const { shared } = createTestApp({
			defaults: { search: { capacity: { search: { min: 2, max: 4 } } } },
			stacks: [{ name: 'stack-1', searchs: { users: {} } }],
		})

		expect(findActions(shared)).toContain('aoss:APIAccessAll')
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
