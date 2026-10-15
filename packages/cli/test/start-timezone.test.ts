import { afterEach, describe, expect, it, vi } from 'vitest'
import { startProjectsTest } from '../src/test/start'

const mocks = vi.hoisted(() => ({
	timezone: undefined as string | undefined,
}))

vi.mock('vitest/node', () => ({
	startVitest: async () => {
		mocks.timezone = process.env['TZ']

		return { state: { getTestModules: () => [] }, close: async () => {} }
	},
}))

describe('test timezone', () => {
	const original = process.env['TZ']

	afterEach(() => {
		process.env['TZ'] = original
	})

	// A runtime TZ change is ignored inside a bun worker, so the workers
	// only run in UTC when they spawn while the parent is set to it.
	it('should spawn the workers in utc & restore the timezone after', async () => {
		process.env['TZ'] = 'America/New_York'

		await startProjectsTest({ projects: [{ name: 'a', dir: '/tmp' }], filters: [] })

		expect(mocks.timezone).toBe('UTC')
		expect(process.env['TZ']).toBe('America/New_York')
	})
})
