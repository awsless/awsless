import { seed } from '../src/lib/server/seed'

describe('seed', () => {
	it('derives a stable uuid from a name', () => {
		expect(seed.uuid('user-1')).toBe(seed.uuid('user-1'))
		expect(seed.uuid('user-1')).not.toBe(seed.uuid('user-2'))
	})

	it('produces a valid v5 style uuid', () => {
		expect(seed.uuid('user-1')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
	})
})
